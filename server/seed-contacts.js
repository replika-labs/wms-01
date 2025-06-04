const { sequelize } = require('./config/database');
const Contact = require('./models/Contact');

const dummyContacts = [
  // Suppliers
  {
    name: 'Budi Santoso',
    type: 'supplier',
    email: 'budi.santoso@textilindonesia.com',
    phone: '021-5551234',
    whatsappPhone: '081234567890',
    address: 'Jl. Industri Raya No. 45, Tangerang, Banten',
    company: 'PT Tekstil Indonesia',
    position: 'Sales Manager',
    notes: 'Supplier kain katun berkualitas tinggi, pengiriman selalu tepat waktu',
    isActive: true
  },
  {
    name: 'Siti Nurhaliza',
    type: 'supplier',
    email: 'siti@fabricjaya.co.id',
    phone: '022-7778888',
    whatsappPhone: '082345678901',
    address: 'Jl. Dago No. 123, Bandung, Jawa Barat',
    company: 'CV Fabric Jaya',
    position: 'Owner',
    notes: 'Spesialis kain premium dan bahan import, harga kompetitif',
    isActive: true
  },
  {
    name: 'Ahmad Wijaya',
    type: 'supplier',
    email: 'ahmad.wijaya@materialindo.com',
    phone: '031-9876543',
    whatsappPhone: '083456789012',
    address: 'Jl. Raya Surabaya No. 67, Surabaya, Jawa Timur',
    company: 'PT Material Indo',
    position: 'Regional Manager',
    notes: 'Supplier benang dan aksesoris jahit, pelayanan 24 jam',
    isActive: true
  },
  {
    name: 'Dewi Lestari',
    type: 'supplier',
    email: 'dewi@rajatekstil.com',
    phone: '0274-555999',
    whatsappPhone: '084567890123',
    address: 'Jl. Malioboro No. 89, Yogyakarta',
    company: 'Raja Tekstil',
    position: 'Marketing Director',
    notes: 'Supplier kain batik dan tradisional, kualitas export',
    isActive: true
  },
  {
    name: 'Rudi Hermawan',
    type: 'supplier',
    email: 'rudi@globalfabric.id',
    phone: '024-3334444',
    whatsappPhone: '085678901234',
    address: 'Jl. Pemuda No. 156, Semarang, Jawa Tengah',
    company: 'Global Fabric',
    position: 'Sales Executive',
    notes: 'Supplier kain polyester dan campuran, stock selalu ready',
    isActive: false
  },

  // Tailors
  {
    name: 'Ibu Ratna',
    type: 'tailor',
    email: 'ratna.tailor@gmail.com',
    phone: '021-8887777',
    whatsappPhone: '081987654321',
    address: 'Jl. Kemang Raya No. 34, Jakarta Selatan',
    company: 'Ratna Tailor',
    position: 'Master Tailor',
    notes: 'Penjahit berpengalaman 15 tahun, spesialis jas dan kemeja formal',
    isActive: true
  },
  {
    name: 'Pak Joko',
    type: 'tailor',
    email: 'joko.jahit@yahoo.com',
    phone: '022-6665555',
    whatsappPhone: '082876543210',
    address: 'Jl. Cihampelas No. 78, Bandung, Jawa Barat',
    company: 'Joko Tailor House',
    position: 'Senior Tailor',
    notes: 'Ahli jahit pakaian casual dan formal, hasil rapi dan presisi',
    isActive: true
  },
  {
    name: 'Mbak Sari',
    type: 'tailor',
    email: 'sari.modiste@gmail.com',
    phone: '0274-111222',
    whatsappPhone: '083765432109',
    address: 'Jl. Prawirotaman No. 45, Yogyakarta',
    company: 'Sari Modiste',
    position: 'Fashion Designer & Tailor',
    notes: 'Spesialis dress dan kebaya, desain custom sesuai permintaan',
    isActive: true
  },
  {
    name: 'Mas Agus',
    type: 'tailor',
    email: 'agus.tailor@hotmail.com',
    phone: '031-2223333',
    whatsappPhone: '084654321098',
    address: 'Jl. Gubeng No. 23, Surabaya, Jawa Timur',
    company: 'Agus Tailoring',
    position: 'Head Tailor',
    notes: 'Penjahit cepat dan berkualitas, bisa handle order besar',
    isActive: true
  },
  {
    name: 'Bu Indah',
    type: 'tailor',
    email: 'indah.seamstress@gmail.com',
    phone: '024-4445555',
    whatsappPhone: '085543210987',
    address: 'Jl. Pandanaran No. 67, Semarang, Jawa Tengah',
    company: 'Indah Seamstress',
    position: 'Master Seamstress',
    notes: 'Ahli jahit pakaian wanita, detail finishing sangat baik',
    isActive: true
  },
  {
    name: 'Pak Bambang',
    type: 'tailor',
    email: 'bambang.tailor@gmail.com',
    phone: '0251-777888',
    whatsappPhone: '086432109876',
    address: 'Jl. Pajajaran No. 12, Bogor, Jawa Barat',
    company: 'Bambang Custom Tailor',
    position: 'Owner & Tailor',
    notes: 'Spesialis jas dan seragam, pengalaman 20 tahun',
    isActive: false
  },

  // Internal Staff
  {
    name: 'Andi Pratama',
    type: 'internal',
    email: 'andi.pratama@company.com',
    phone: '021-1112222',
    whatsappPhone: '081111222333',
    address: 'Jl. Sudirman No. 100, Jakarta Pusat',
    company: 'WMS Company',
    position: 'Production Manager',
    notes: 'Mengawasi seluruh proses produksi dan quality control',
    isActive: true
  },
  {
    name: 'Maya Sari',
    type: 'internal',
    email: 'maya.sari@company.com',
    phone: '021-3334444',
    whatsappPhone: '082222333444',
    address: 'Jl. Thamrin No. 200, Jakarta Pusat',
    company: 'WMS Company',
    position: 'Purchasing Manager',
    notes: 'Bertanggung jawab atas pembelian bahan baku dan supplier relations',
    isActive: true
  },
  {
    name: 'Rizki Ramadan',
    type: 'internal',
    email: 'rizki.ramadan@company.com',
    phone: '021-5556666',
    whatsappPhone: '083333444555',
    address: 'Jl. Gatot Subroto No. 300, Jakarta Selatan',
    company: 'WMS Company',
    position: 'Quality Control Supervisor',
    notes: 'Memastikan kualitas produk sesuai standar sebelum pengiriman',
    isActive: true
  },
  {
    name: 'Fitri Handayani',
    type: 'internal',
    email: 'fitri.handayani@company.com',
    phone: '021-7778888',
    whatsappPhone: '084444555666',
    address: 'Jl. Rasuna Said No. 400, Jakarta Selatan',
    company: 'WMS Company',
    position: 'Inventory Coordinator',
    notes: 'Mengelola stock bahan baku dan finished goods',
    isActive: true
  },
  {
    name: 'Doni Setiawan',
    type: 'internal',
    email: 'doni.setiawan@company.com',
    phone: '021-9990000',
    whatsappPhone: '085555666777',
    address: 'Jl. HR Rasuna Said No. 500, Jakarta Selatan',
    company: 'WMS Company',
    position: 'Logistics Coordinator',
    notes: 'Mengatur pengiriman dan distribusi produk ke customer',
    isActive: true
  },
  {
    name: 'Lina Marlina',
    type: 'internal',
    email: 'lina.marlina@company.com',
    phone: '021-1234567',
    whatsappPhone: '086666777888',
    address: 'Jl. Kuningan No. 600, Jakarta Selatan',
    company: 'WMS Company',
    position: 'Customer Service Manager',
    notes: 'Menangani customer complaints dan after sales service',
    isActive: false
  }
];

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.');
    
    // Clear existing contacts (optional - remove this if you want to keep existing data)
    console.log('Clearing existing contacts...');
    await Contact.destroy({ where: {}, force: true });
    
    // Insert dummy data
    console.log('Inserting dummy contacts...');
    const createdContacts = await Contact.bulkCreate(dummyContacts);
    
    console.log(`Successfully created ${createdContacts.length} dummy contacts:`);
    
    // Show summary by type
    const suppliers = createdContacts.filter(c => c.type === 'supplier');
    const tailors = createdContacts.filter(c => c.type === 'tailor');
    const internal = createdContacts.filter(c => c.type === 'internal');
    
    console.log(`- Suppliers: ${suppliers.length} contacts`);
    console.log(`- Tailors: ${tailors.length} contacts`);
    console.log(`- Internal: ${internal.length} contacts`);
    
    // Show active vs inactive
    const active = createdContacts.filter(c => c.isActive);
    const inactive = createdContacts.filter(c => !c.isActive);
    
    console.log(`- Active: ${active.length} contacts`);
    console.log(`- Inactive: ${inactive.length} contacts`);
    
    console.log('\nDummy data seeded successfully!');
    console.log('You can now test the Contact Management system with realistic Indonesian data.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding dummy data:', error);
    process.exit(1);
  }
})(); 