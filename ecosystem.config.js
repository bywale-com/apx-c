module.exports = {
  apps: [{
    name: 'apex-website',
    script: 'npm',
    args: 'start',
    cwd: '/home/ec2-user/apx-c',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
