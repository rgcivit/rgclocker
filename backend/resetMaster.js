const { User, sequelize } = require('./models');
const bcrypt = require('bcryptjs');

async function reset() {
  try {
    await sequelize.authenticate();
    console.log('Conectado a la base de datos para restablecer usuario maestro...');
    
    const masterUsername = 'locker';
    const masterPassword = 'Tabulario-801';
    const masterEmail = 'master@rgclocker.local';
    
    // Hash password
    const passwordHash = await bcrypt.hash(masterPassword, 10);
    
    // Find or create
    let [user, created] = await User.findOrCreate({
      where: { username: masterUsername },
      defaults: {
        email: masterEmail,
        passwordHash,
        isActive: true,
        isVerified: true
      }
    });
    
    if (!created) {
      // Update existing
      user.passwordHash = passwordHash;
      user.isActive = true;
      user.isVerified = true;
      await user.save();
      console.log(`Usuario maestro '${masterUsername}' ya existía. Se actualizó su contraseña a '${masterPassword}' y se forzó su estado a Activo/Verificado.`);
    } else {
      console.log(`Usuario maestro '${masterUsername}' creado exitosamente con contraseña '${masterPassword}' y estado Activo/Verificado.`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error durante el restablecimiento del usuario maestro:', error);
    process.exit(1);
  }
}

reset();
