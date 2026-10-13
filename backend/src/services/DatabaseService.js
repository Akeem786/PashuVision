const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

/**
 * Database Service - Supabase with Local JSON fallback
 * 
 * When Supabase credentials are provided, connects to Supabase.
 * Otherwise, falls back to local JSON files in backend/data for offline development.
 */
class DatabaseService {
  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    this.dataDir = process.env.VERCEL ? '/tmp/data' : path.join(__dirname, '..', '..', 'data');
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    if (process.env.VERCEL) {
      const seedDir = path.join(__dirname, '..', '..', 'data');
      if (fs.existsSync(seedDir)) {
        try {
          const files = fs.readdirSync(seedDir);
          for (const file of files) {
            if (file.endsWith('.json')) {
              const destFile = path.join(this.dataDir, file);
              if (!fs.existsSync(destFile)) {
                fs.copyFileSync(path.join(seedDir, file), destFile);
              }
            }
          }
        } catch (copyErr) {
          console.warn('⚠️ Could not copy seed data to /tmp/data:', copyErr.message);
        }
      }
    }

    console.log('🔍 DatabaseService initialization:');
    console.log('  SUPABASE_URL:', supabaseUrl ? `✓ Set (${supabaseUrl.substring(0, 30)}...)` : '✗ Missing');
    console.log('  SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ Set' : '✗ Missing');
    console.log('  SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing');
    console.log('  Using key type:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE' : (process.env.SUPABASE_ANON_KEY ? 'ANON' : 'NONE'));
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('📁 No Supabase credentials detected. Operating in Local JSON database mode (backend/data).');
      this.isLocal = true;
      this.supabase = null;
      return;
    }
    
    this.isLocal = false;
    const isServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (isServiceRole) {
      console.log('✅ Connected to Supabase database using SERVICE ROLE KEY (bypasses RLS)');
    } else {
      console.warn('⚠️  Using ANON KEY - RLS policies will apply. Consider using SERVICE ROLE KEY for admin operations.');
    }
    
    try {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      console.log('✅ Supabase client created successfully');
    } catch (clientError) {
      console.error('❌ Error creating Supabase client:', clientError.message);
      console.log('📁 Falling back to Local JSON database mode.');
      this.isLocal = true;
      this.supabase = null;
    }
  }

  _readJson(filename, defaultValue = []) {
    const filePath = path.join(this.dataDir, filename);
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      console.error(`❌ Error reading ${filename}:`, e.message);
      return defaultValue;
    }
  }

  _writeJson(filename, data) {
    const filePath = path.join(this.dataDir, filename);
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.error(`❌ Error writing ${filename}:`, e.message);
    }
  }

  // ==================== USERS ====================
  
  async getUsers() {
    if (this.isLocal) {
      return this._readJson('users.json', []);
    }
    const { data, error } = await this.supabase
      .from('users')
      .select('*');
    
    if (error) {
      console.error('❌ Error fetching users:', error);
      throw error;
    }
    return data || [];
  }

  async saveUsers(users) {
    if (this.isLocal) {
      this._writeJson('users.json', users);
      return;
    }
    const { error } = await this.supabase
      .from('users')
      .upsert(users, { onConflict: 'id' });
    
    if (error) {
      console.error('❌ Error saving users:', error);
      throw error;
    }
  }

  async createUser(user) {
    if (this.isLocal) {
      const users = this._readJson('users.json', []);
      const idx = users.findIndex(u => u.id === user.id || u.email === user.email);
      if (idx >= 0) {
        users[idx] = { ...users[idx], ...user };
      } else {
        users.push(user);
      }
      this._writeJson('users.json', users);
      return user;
    }
    const { data, error } = await this.supabase
      .from('users')
      .upsert(user, { onConflict: 'id' })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creating/updating user:', error);
      throw error;
    }
    return data;
  }

  async updateUser(userId, updates) {
    if (this.isLocal) {
      const users = this._readJson('users.json', []);
      const idx = users.findIndex(u => u.id === userId);
      if (idx >= 0) {
        users[idx] = { ...users[idx], ...updates, updated_at: new Date().toISOString() };
        this._writeJson('users.json', users);
        return users[idx];
      }
      return null;
    }
    const { data, error } = await this.supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error updating user:', error);
      throw error;
    }
    return data;
  }

  async deleteUser(userId) {
    if (this.isLocal) {
      const users = this._readJson('users.json', []);
      const existingUser = users.find(u => u.id === userId);
      if (!existingUser) {
        throw new Error('User not found');
      }
      const filtered = users.filter(u => u.id !== userId);
      this._writeJson('users.json', filtered);
      return { success: true, deletedId: userId, deletedUser: existingUser };
    }

    console.log('🗑️  Attempting to delete user from Supabase:', userId);
    
    const { data: existingUser, error: checkError } = await this.supabase
      .from('users')
      .select('id, email, name')
      .eq('id', userId)
      .single();
    
    if (checkError) {
      if (checkError.code === 'PGRST116') {
        throw new Error('User not found');
      }
      console.error('❌ Error checking user existence:', checkError);
      throw checkError;
    }
    
    if (!existingUser) {
      throw new Error('User not found');
    }
    
    const { data: deletedData, error: deleteError } = await this.supabase
      .from('users')
      .delete()
      .eq('id', userId)
      .select();
    
    if (deleteError) {
      console.error('❌ Error deleting user from Supabase:', deleteError);
      throw deleteError;
    }
    
    return { success: true, deletedId: userId, deletedUser: existingUser };
  }

  // ==================== ANIMALS ====================
  
  async getAnimals() {
    if (this.isLocal) {
      return this._readJson('animals.json', []);
    }
    console.log('📖 DatabaseService: Fetching animals from Supabase...');
    const { data, error } = await this.supabase
      .from('animals')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ DatabaseService: Error fetching animals:', error);
      throw error;
    }
    return data || [];
  }

  async saveAnimals(animals) {
    if (this.isLocal) {
      this._writeJson('animals.json', animals);
      return;
    }
    const { error } = await this.supabase
      .from('animals')
      .upsert(animals, { onConflict: 'id' });
    
    if (error) {
      console.error('❌ Error saving animals:', error);
      throw error;
    }
  }

  async createAnimal(animal) {
    if (!animal || !animal.id) {
      const err = new Error('Animal record must include a valid ID');
      err.code = '23502';
      throw err;
    }

    if (this.isLocal) {
      const animals = this._readJson('animals.json', []);
      
      // Enforce unique animal ID
      if (animals.some(a => String(a.id) === String(animal.id))) {
        const err = new Error(`Duplicate animal ID: An animal with ID '${animal.id}' already exists.`);
        err.code = '23505';
        throw err;
      }

      // Enforce unique ear tag if provided
      const earTag = (animal.ear_tag || animal.earTag || '').trim();
      if (earTag && animals.some(a => (a.ear_tag || a.earTag || '').trim() === earTag)) {
        const err = new Error(`Duplicate ear tag: An animal with ear tag '${earTag}' already exists.`);
        err.code = '23505';
        throw err;
      }

      animals.unshift(animal);
      this._writeJson('animals.json', animals);
      return animal;
    }

    console.log('📝 DatabaseService: Creating animal in Supabase:', animal.id);
    const { data, error } = await this.supabase
      .from('animals')
      .insert(animal)
      .select()
      .single();
    
    if (error) {
      console.error('❌ DatabaseService: Error creating animal:', error);
      throw error;
    }
    return data;
  }

  async updateAnimal(animalId, updates) {
    if (!animalId) return null;

    if (this.isLocal) {
      const animals = this._readJson('animals.json', []);
      const idx = animals.findIndex(a => String(a.id) === String(animalId));
      if (idx < 0) return null;

      // Check ear tag uniqueness on update
      const newEarTag = updates.ear_tag !== undefined ? (updates.ear_tag || '').trim() : (updates.earTag !== undefined ? (updates.earTag || '').trim() : null);
      if (newEarTag) {
        const conflict = animals.find(a => String(a.id) !== String(animalId) && (a.ear_tag || a.earTag || '').trim() === newEarTag);
        if (conflict) {
          const err = new Error(`Duplicate ear tag: An animal with ear tag '${newEarTag}' already exists.`);
          err.code = '23505';
          throw err;
        }
      }

      animals[idx] = { ...animals[idx], ...updates, updated_at: new Date().toISOString() };
      this._writeJson('animals.json', animals);
      return animals[idx];
    }

    const { data, error } = await this.supabase
      .from('animals')
      .update(updates)
      .eq('id', animalId)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error updating animal:', error);
      throw error;
    }
    return data;
  }

  async deleteAnimal(animalId) {
    if (!animalId) return false;

    if (this.isLocal) {
      const animals = this._readJson('animals.json', []);
      const initialCount = animals.length;
      const filtered = animals.filter(a => String(a.id) !== String(animalId));
      if (filtered.length === initialCount) {
        return false; // Not found
      }
      this._writeJson('animals.json', filtered);
      return true;
    }

    const { error } = await this.supabase
      .from('animals')
      .delete()
      .eq('id', animalId);
    
    if (error) {
      console.error('❌ Error deleting animal:', error);
      throw error;
    }
    return true;
  }

  // ==================== LOGS ====================
  
  async getLogs() {
    if (this.isLocal) {
      return this._readJson('logs.json', []);
    }
    const { data, error } = await this.supabase
      .from('activity_logs')
      .select('*')
      .order('timestamp', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching logs:', error);
      throw error;
    }
    return data || [];
  }

  async saveLogs(logs) {
    if (this.isLocal) {
      this._writeJson('logs.json', logs);
      return;
    }
    const newLogs = logs.filter(log => !log.id || !log.saved);
    if (newLogs.length > 0) {
      const { error } = await this.supabase
        .from('activity_logs')
        .insert(newLogs);
      
      if (error) {
        console.error('❌ Error saving logs:', error);
        throw error;
      }
    }
  }

  async createLog(log) {
    if (this.isLocal) {
      const logs = this._readJson('logs.json', []);
      logs.unshift(log);
      this._writeJson('logs.json', logs);
      return log;
    }
    const { data, error } = await this.supabase
      .from('activity_logs')
      .insert(log)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creating log:', error);
      throw error;
    }
    return data;
  }

  // ==================== BREEDS ====================
  
  async getBreeds() {
    if (this.isLocal) {
      return this._readJson('breeds.json', []);
    }
    const { data, error } = await this.supabase
      .from('breeds')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('❌ Error fetching breeds:', error);
      throw error;
    }
    return data || [];
  }

  async saveBreeds(breeds) {
    if (this.isLocal) {
      this._writeJson('breeds.json', breeds);
      return;
    }
    const { error } = await this.supabase
      .from('breeds')
      .upsert(breeds, { onConflict: 'id' });
    
    if (error) {
      console.error('❌ Error saving breeds:', error);
      throw error;
    }
  }

  async createBreed(breed) {
    if (this.isLocal) {
      const breeds = this._readJson('breeds.json', []);
      breeds.unshift(breed);
      this._writeJson('breeds.json', breeds);
      return breed;
    }
    const { data, error } = await this.supabase
      .from('breeds')
      .insert(breed)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creating breed:', error);
      throw error;
    }
    return data;
  }

  async updateBreed(breedId, updates) {
    if (this.isLocal) {
      const breeds = this._readJson('breeds.json', []);
      const idx = breeds.findIndex(b => b.id === breedId);
      if (idx >= 0) {
        breeds[idx] = { ...breeds[idx], ...updates, updated_at: new Date().toISOString() };
        this._writeJson('breeds.json', breeds);
        return breeds[idx];
      }
      return null;
    }
    const { data, error } = await this.supabase
      .from('breeds')
      .update(updates)
      .eq('id', breedId)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error updating breed:', error);
      throw error;
    }
    return data;
  }

  async deleteBreed(breedId) {
    if (this.isLocal) {
      const breeds = this._readJson('breeds.json', []);
      const existingBreed = breeds.find(b => b.id === breedId);
      if (!existingBreed) {
        throw new Error('Breed not found');
      }
      const filtered = breeds.filter(b => b.id !== breedId);
      this._writeJson('breeds.json', filtered);
      return { success: true, deletedId: breedId, deletedBreed: existingBreed };
    }

    console.log('🗑️  Attempting to delete breed from Supabase:', breedId);
    
    const { data: existingBreed, error: checkError } = await this.supabase
      .from('breeds')
      .select('id, name')
      .eq('id', breedId)
      .single();
    
    if (checkError) {
      if (checkError.code === 'PGRST116') {
        throw new Error('Breed not found');
      }
      console.error('❌ Error checking breed existence:', checkError);
      throw checkError;
    }
    
    if (!existingBreed) {
      throw new Error('Breed not found');
    }
    
    const { data: deletedData, error: deleteError } = await this.supabase
      .from('breeds')
      .delete()
      .eq('id', breedId)
      .select();
    
    if (deleteError) {
      console.error('❌ Error deleting breed from Supabase:', deleteError);
      throw deleteError;
    }
    
    return { success: true, deletedId: breedId, deletedBreed: existingBreed };
  }

  // ==================== RECORD AUDIT LOG / BLOCKCHAIN ====================

  async appendAuditRecord(auditRecord) {
    if (this.isLocal) {
      const records = this._readJson('record_audit_log.json', []);
      records.push(auditRecord);
      this._writeJson('record_audit_log.json', records);
      return auditRecord;
    }

    try {
      const { data, error } = await this.supabase
        .from('record_audit_log')
        .insert([auditRecord])
        .select()
        .single();

      if (error) {
        console.warn('⚠️  Supabase audit log insert failed (table may need migration), falling back to local JSON:', error.message);
        const records = this._readJson('record_audit_log.json', []);
        records.push(auditRecord);
        this._writeJson('record_audit_log.json', records);
        return auditRecord;
      }
      return data;
    } catch (err) {
      console.warn('⚠️  Exception inserting audit record, falling back to local JSON:', err.message);
      const records = this._readJson('record_audit_log.json', []);
      records.push(auditRecord);
      this._writeJson('record_audit_log.json', records);
      return auditRecord;
    }
  }

  async getAuditRecords(animalId) {
    if (this.isLocal) {
      const records = this._readJson('record_audit_log.json', []);
      return records
        .filter(r => (r.animal_id === animalId || r.animalId === animalId))
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    try {
      const { data, error } = await this.supabase
        .from('record_audit_log')
        .select('*')
        .eq('animal_id', animalId)
        .order('timestamp', { ascending: true });

      if (error) {
        console.warn('⚠️  Supabase fetch audit records error, using local fallback:', error.message);
        const records = this._readJson('record_audit_log.json', []);
        return records
          .filter(r => (r.animal_id === animalId || r.animalId === animalId))
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      }
      return data || [];
    } catch (err) {
      console.warn('⚠️  Exception fetching audit records, using local fallback:', err.message);
      const records = this._readJson('record_audit_log.json', []);
      return records
        .filter(r => (r.animal_id === animalId || r.animalId === animalId))
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }
  }

  async getAllAuditRecords(limit = 100, offset = 0) {
    if (this.isLocal) {
      const records = this._readJson('record_audit_log.json', []);
      return records
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(offset, offset + limit);
    }

    try {
      const { data, error } = await this.supabase
        .from('record_audit_log')
        .select('*')
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        const records = this._readJson('record_audit_log.json', []);
        return records.slice(offset, offset + limit);
      }
      return data || [];
    } catch (err) {
      const records = this._readJson('record_audit_log.json', []);
      return records.slice(offset, offset + limit);
    }
  }
}

module.exports = DatabaseService;
