'use strict';

const MINUTE = 60000;

class Clock {
  constructor() {
    this.alarms   = {};
    this.lastTick = null;

    this.clock = setInterval(() => {
      const date = new Date();
      const time = ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2);

      if (this.lastTick !== time.slice(-5)) {
        this.lastTick = time.slice(-5);
        console.log((new Date()) + ' tick > ' + time + ':' + ('0' + date.getSeconds()).slice(-2));
      }

      if (this.alarms && this.alarms[time]) {
        if(this.alarms[time].lastPlayed === null || this.alarms[time].lastPlayed > Date.now() + MINUTE) {
          console.log(`Alarm for: ${time}`);

          this.alarms[time].lastPlayed = Date.now();
          this.alarms[time].handler();
        }
      }

    }, 1000);
  }

  setAlarm(time, handler) {
    if (!handler) {
      handler = function() {};
    }

    this.alarms[time] = {
      handler,
      lastPlayed: null
    };
    console.log(`⏰  Setting alarm for ${time}`);
    console.log(this.alarms);
  }

  clearAlarm(time) {
    if (this.alarms && this.alarms[time]) {
      delete this.alarms[time];
      console.log(`Removed alarm for ${time}`);
      console.log(this.alarms);
    }
  }

  clearAllAlarms() {
    this.alarms = {};
    console.log('✨  Cleared all alarms');
  }

}


module.exports = Clock;
