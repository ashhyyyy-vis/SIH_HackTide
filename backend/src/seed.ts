import fs from 'fs';
import path from 'path';
import pool from './config/database';

async function seedDatabase() {
  try {
    console.log('Starting database seed...');

    // Read partner data
    const partnerPath = path.join(__dirname, '../../scraper/output/partner_locator.json');
    const partners = JSON.parse(fs.readFileSync(partnerPath, 'utf-8'));

    console.log(`Found ${partners.length} partners to insert`);

    // Insert partners
    for (const partner of partners.slice(0, 100)) { // Limit to 100 for testing
      const query = `
        INSERT INTO channel_partners 
        (name_i18n, partner_type, location, npa_percentage, allocated_funds, utilized_funds, address_i18n, district_i18n, state_i18n)
        VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5, $6, $7, $8, $9, $10)
        ON CONFLICT DO NOTHING
      `;
      
      await pool.query(query, [
        { en: partner.partnerName },
        partner.partnerType,
        partner.lng,
        partner.lat,
        Math.random() * 10, // Random NPA percentage
        1000000 + Math.random() * 5000000, // Random allocated funds
        Math.random() * 3000000, // Random utilized funds
        { en: partner.address },
        { en: partner.district },
        { en: partner.state }
      ]);
    }

    console.log('Partners seeded successfully');

    // Read scheme data
    const schemePath = path.join(__dirname, '../../scraper/data/ps92_dataset.json');
    const schemeData = JSON.parse(fs.readFileSync(schemePath, 'utf-8'));
    const schemes = schemeData.schemes || [];

    console.log(`Found ${schemes.length} schemes to insert`);

    // Insert schemes
    for (const scheme of schemes.slice(0, 10)) { // Limit to 10 for testing
      const query = `
        INSERT INTO schemes 
        (title_i18n, description_i18n, max_amount, interest_rate_min, interest_rate_max, target_category)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING
      `;
      
      await pool.query(query, [
        { en: scheme.name || scheme.title || 'Scheme' },
        { en: scheme.description || scheme.purpose || 'Description' },
        scheme.max_amount || 500000,
        scheme.interest_rate_min || 5,
        scheme.interest_rate_max || 8,
        scheme.target_category || 'SC'
      ]);
    }

    console.log('Schemes seeded successfully');
    console.log('Database seed completed!');

    await pool.end();
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
