module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps : [

    // First application
    {
      name      : 'adhan-mca',
      script    : 'index.js',
      env: {},
      env_production : {
        NODE_ENV: 'production'
      }
    },
  ],

  /**
   * Deployment section
   * http://pm2.keymetrics.io/docs/usage/deployment/
   */
  deploy : {
    production : {
      user : 'pi',
      host : '10.0.0.224',
      ref  : 'origin/master',
      repo : 'https://github.com/ahmedfarooki/adhan-mca.git',
      path : '/home/pi/apps/adhan-mca',
      'post-deploy' : 'pm2 reload ecosystem.config.js --env production'
    },
    build : {
      user : 'pi',
      host : '10.0.0.224',
      ref  : 'origin/master',
      repo : 'https://github.com/ahmedfarooki/adhan-mca.git',
      path : '/home/pi/apps/adhan-mca',
      'post-deploy' : 'npm install'
    }
  }
};
