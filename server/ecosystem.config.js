module.exports = {
  apps: [
    {
      name: 'server',
      script: 'server.js',
      args: 'node server',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      max_memory_restart: '500M',
      autorestart: true,
      watch: false,
      time: true,
    },
  ],
};
