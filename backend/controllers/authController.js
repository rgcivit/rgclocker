const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const dotenv = require('dotenv');
const path = require('path');
const nodemailer = require('nodemailer');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_key_rgclocker_vault_2026';

/**
 * Sends a secure email with the activation code.
 * Falls back to simulating the email in the server logs if SMTP is not configured.
 */
async function sendActivationEmail(userEmail, username, code) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || 'noreply@rgclocker.local';

  const adminEmail = 'rgcivit@gmail.com';

  // 1. Log to server terminal for simulation (essential for local dev & free tier logs)
  console.log(`\n================== [SECURITY EMAIL SIMULATION] ==================`);
  console.log(`To Admin: ${adminEmail}`);
  console.log(`Subject: [rgClocker] Autorización Requerida para ${username}`);
  console.log(`User Email: ${userEmail}`);
  console.log(`Activation Code: ${code}`);
  console.log(`=================================================================\n`);

  // 2. Try SMTP if configured in .env
  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort, 10),
        secure: parseInt(smtpPort, 10) === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      await transporter.sendMail({
        from: smtpFrom,
        to: adminEmail,
        subject: `rgClocker - Autorización Requerida para ${username}`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #1e293b; border-radius: 12px; background-color: #0f172a; color: #f1f5f9;">
            <h2 style="color: #34d399; text-align: center; margin-bottom: 20px; font-family: monospace;">rgClocker Admin</h2>
            <h3 style="color: #f1f5f9; text-align: center; margin-bottom: 25px;">Solicitud de Autorización</h3>
            <p>Hola Administrador,</p>
            <p>Un nuevo usuario se ha registrado o ha intentado iniciar sesión en rgClocker y requiere su autorización:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; color: #f1f5f9; background-color: #020617; border: 1px solid #1e293b; border-radius: 8px;">
              <tr>
                <td style="padding: 10px; font-weight: bold; color: #94a3b8; width: 120px; border-bottom: 1px solid #1e293b;">Usuario:</td>
                <td style="padding: 10px; font-family: monospace; font-size: 16px; border-bottom: 1px solid #1e293b;">${username}</td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: bold; color: #94a3b8;">Email:</td>
                <td style="padding: 10px; font-family: monospace; font-size: 16px;">${userEmail}</td>
              </tr>
            </table>
            <p>Para autorizar el acceso de este usuario, envíale el siguiente código de activación de 6 dígitos:</p>
            <div style="background-color: #020617; border: 1px solid #1e293b; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 4px; text-align: center; color: #34d399; margin: 25px 0; font-family: monospace;">
              ${code}
            </div>
            <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 30px; border-top: 1px solid #1e293b; padding-top: 15px;">
              Este es un correo automático generado por el sistema de seguridad de rgClocker.
            </p>
          </div>
        `
      });
      console.log(`[Google Drive Service] Authorization email successfully sent to Admin (${adminEmail}) via SMTP.`);
    } catch (err) {
      console.error('[Google Drive Service] Failed to send SMTP email, fallback to simulation:', err.message);
    }
  } else {
    console.log('[Google Drive Service] SMTP environment variables are not configured in .env. Falling back to simulation logs.');
  }
}

/**
 * Register a new user (Forces inactive state until email code is verified)
 */
async function register(req, res) {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Bad Request', message: 'All fields (username, email, password) are required.' });
    }

    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [User.sequelize.Sequelize.Op.or]: [
          { username: normalizedUsername },
          { email: normalizedEmail }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Username or Email is already registered.'
      });
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate 6-digit verification code
    const activationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Create inactive user with activationCode
    const newUser = await User.create({
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
      isActive: false, // Must verify to activate
      activationCode
    });

    // Send email with the verification code
    await sendActivationEmail(normalizedEmail, normalizedUsername, activationCode);

    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const isSmtpConfigured = !!(smtpHost && smtpUser && smtpPass);

    let message = 'Registro completado. El administrador ha recibido un correo para autorizar tu cuenta. Solicítale tu código de activación.';
    if (!isSmtpConfigured) {
      message = `Registro completado. [DEV SIMULATION] El administrador rgcivit@gmail.com debe autorizarte. Tu código es: ${activationCode}`;
    }

    res.status(201).json({
      message,
      requireActivation: true,
      username: newUser.username
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

/**
 * Log in an existing user
 */
async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Bad Request', message: 'Username and password are required.' });
    }

    const normalizedUsername = username.trim().toLowerCase();

    // Find user
    const user = await User.findOne({ where: { username: normalizedUsername } });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid username or password.' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid username or password.' });
    }

    // Gatekeeper: Reject logins for inactive users
    if (!user.isActive) {
      // Re-generate and re-send code to ensure they can complete activation
      const newCode = Math.floor(100000 + Math.random() * 900000).toString();
      user.activationCode = newCode;
      await user.save();
      await sendActivationEmail(user.email, user.username, newCode);

      const smtpHost = process.env.SMTP_HOST;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const isSmtpConfigured = !!(smtpHost && smtpUser && smtpPass);

      let message = 'Tu cuenta no está activa. Se ha enviado un correo al administrador para autorizar tu cuenta. Solicítale tu código de activación.';
      if (!isSmtpConfigured) {
        message = `Tu cuenta no está activa. [DEV SIMULATION] El administrador rgcivit@gmail.com debe autorizarte. Tu código es: ${newCode}`;
      }

      return res.status(403).json({
        error: 'Forbidden',
        message,
        requireActivation: true,
        username: user.username
      });
    }

    // Generate JWT Token (Expires in 2 hours)
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

/**
 * Verify account using 6-digit code
 */
async function activate(req, res) {
  try {
    const { username, code } = req.body;

    if (!username || !code) {
      return res.status(400).json({ error: 'Bad Request', message: 'Username and activation code are required.' });
    }

    const normalizedUsername = username.trim().toLowerCase();

    const user = await User.findOne({ where: { username: normalizedUsername } });
    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found.' });
    }

    if (user.isActive) {
      return res.status(400).json({ error: 'Bad Request', message: 'Account is already active.' });
    }

    if (user.activationCode !== code.trim()) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Código de activación incorrecto.' });
    }

    // Activate user
    user.isActive = true;
    user.activationCode = null;
    await user.save();

    // Generate JWT Token (Expires in 2 hours)
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({
      message: 'Account activated successfully.',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Activation error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

/**
 * Get current user profile (using verified JWT)
 */
async function getProfile(req, res) {
  try {
    // req.user is attached by authMiddleware
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'username', 'email', 'createdAt']
    });

    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found.' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

module.exports = {
  register,
  login,
  activate,
  getProfile
};
