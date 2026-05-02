/**
 * Seed Groups — Idempotent script to create initial accountability groups.
 *
 * Usage: npm run seed:groups
 *
 * Creates 6 trigger types × 3 instances each = 18 groups.
 * Uses triggerType + instanceNum unique index to prevent duplicates.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Group = require('../models/Group.model');

const GROUP_TEMPLATES = [
  {
    triggerType: 'late_night',
    baseName: 'LATE NIGHT SCROLLERS',
    description: 'For people whose worst scrolling happens after 10pm. We track together, no judgment.',
    icon: 'moon',
  },
  {
    triggerType: 'morning',
    baseName: 'MORNING HABIT BUILDERS',
    description: 'Opening apps before getting out of bed. We are working on this together.',
    icon: 'sun',
  },
  {
    triggerType: 'stress',
    baseName: 'STRESS SCROLLERS',
    description: 'Using Instagram as an escape from anxiety or pressure. We see you.',
    icon: 'zap',
  },
  {
    triggerType: 'boredom',
    baseName: 'BOREDOM BROWSERS',
    description: 'The habit scroll. Nothing to do, so you open the app. We are tracking this pattern.',
    icon: 'meh',
  },
  {
    triggerType: 'procrastination',
    baseName: 'PROCRASTINATION PATROL',
    description: 'Avoiding something important by opening social apps. You know the feeling.',
    icon: 'timer',
  },
  {
    triggerType: 'general',
    baseName: 'GENERAL AWARENESS',
    description: 'No specific trigger pattern — just working on being more intentional about scrolling.',
    icon: 'target',
  },
];

const INSTANCES_PER_TYPE = 3;

const INSTANCE_SUFFIXES = ['', ' II', ' III', ' IV', ' V'];

async function seedGroups() {
  await connectDB();

  let created = 0;
  let skipped = 0;

  for (const template of GROUP_TEMPLATES) {
    for (let i = 1; i <= INSTANCES_PER_TYPE; i++) {
      const suffix = INSTANCE_SUFFIXES[i - 1] || ` ${i}`;
      const name = `${template.baseName}${suffix}`;

      try {
        // Upsert using the unique compound index (triggerType + instanceNum)
        const result = await Group.findOneAndUpdate(
          { triggerType: template.triggerType, instanceNum: i },
          {
            $setOnInsert: {
              name,
              triggerType: template.triggerType,
              description: template.description,
              icon: template.icon,
              maxMembers: 8,
              isOpen: true,
              instanceNum: i,
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // Check if this was a new creation or existing doc
        if (result.name === name) {
          console.log(`  ✓ ${name} (${template.triggerType} #${i})`);
          created++;
        } else {
          console.log(`  ○ ${result.name} already exists (${template.triggerType} #${i})`);
          skipped++;
        }
      } catch (err) {
        if (err.code === 11000) {
          console.log(`  ○ ${name} already exists (duplicate key)`);
          skipped++;
        } else {
          console.error(`  ✗ Failed to seed ${name}:`, err.message);
        }
      }
    }
  }

  const total = await Group.countDocuments();
  console.log(`\n──────────────────────────────────`);
  console.log(`Created: ${created} | Skipped: ${skipped} | Total in DB: ${total}`);
  console.log(`──────────────────────────────────`);

  await mongoose.connection.close();
  process.exit(0);
}

seedGroups().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
