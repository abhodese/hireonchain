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
      error_file: null,
      out_file: null,
      max_memory_restart: '500M',
      autorestart: true,
      watch: false,
      time: true,
    },
  ],
};
