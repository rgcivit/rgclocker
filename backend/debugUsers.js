const { User, sequelize } = require('./models');

async function debug() {
  try {
    await sequelize.authenticate();
    console.log('--- DEBUG BASE DE DATOS ---');
    
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'isActive', 'isVerified', 'createdAt']
    });
    
    console.log(`Total de usuarios encontrados: ${users.length}`);
    users.forEach(u => {
      console.log(`- ID: ${u.id}`);
      console.log(`  Usuario: "${u.username}"`);
      console.log(`  Email: "${u.email}"`);
      console.log(`  isActive: ${u.isActive}`);
      console.log(`  isVerified: ${u.isVerified}`);
      console.log(`  Fecha Creación: ${u.createdAt}`);
      console.log('---------------------------');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error durante la depuración de usuarios:', error);
    process.exit(1);
  }
}

debug();
