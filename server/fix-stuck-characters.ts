/**
 * One-time script to fix characters that are stuck in dungeons
 * This will free all characters that are marked as active but should be available
 */

import { db } from './db';
import { characters } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function fixStuckCharacters() {
  try {
    console.log('Starting character fix process...');
    
    // Get all characters that are marked as active
    const activeCharacters = await db.query.characters.findMany({
      where: eq(characters.isActive, true)
    });
    
    console.log(`Found ${activeCharacters.length} active characters`);
    
    // Update each character to set isActive = false
    let fixedCount = 0;
    for (const character of activeCharacters) {
      try {
        // Update the character in the database
        await db.update(characters)
          .set({ isActive: false })
          .where(eq(characters.id, character.id));
        
        console.log(`Fixed character: ${character.name} (ID: ${character.id})`);
        fixedCount++;
      } catch (e) {
        console.error(`Error fixing character ${character.id}:`, e);
      }
    }
    
    console.log(`Successfully fixed ${fixedCount} out of ${activeCharacters.length} characters`);
    console.log('Character fix process completed');
  } catch (error) {
    console.error('Error in fix stuck characters process:', error);
  }
}

// Run the fix
fixStuckCharacters()
  .then(() => {
    console.log('Fix script completed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Fix script failed:', err);
    process.exit(1);
  });