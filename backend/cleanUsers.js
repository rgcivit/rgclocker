const { User, sequelize } = require('./models');

async function clean() {
  try {
    await sequelize.authenticate();
    console.log('Conectado a la base de datos para la limpieza...');
    
    // Delete all users EXCEPT the master user 'locker'
    const deletedCount = await User.destroy({
      where: {
        username: {
          [sequelize.Sequelize.Op.ne]: 'locker'
        }
      }
    });
    
    console.log(`\n=================================================================`);
    console.log(`¡LIMPIEZA EXITOSA!`);
    console.log(`Se eliminaron de forma permanente ${deletedCount} usuarios.`);
    console.log(`Todos sus lockers, bóvedas y documentos asociados se borraron en cascada.`);
    console.log(`El usuario maestro 'locker' se ha conservado intacto.`);
    console.log(`=================================================================\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error durante la limpieza de la base de datos:', error);
    process.exit(1);
  }
}

clean();
