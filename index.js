'use strict';

const Promise = require('bluebird');
const PouchDB = require('pouchdb');
const player  = require('play-sound')();
const Clock   = require('./clock');
const scraper = require('./scraper');

const db    = new PouchDB('prayers.db');
const clock = new Clock();

const PRAYERS = [
  'fajar',
  'dhuhr',
  'asr',
  'maghrib',
  'ishaa',
];


function init() {
  console.log("🕋  Starting up adhan-mca...");
  return scraper.update()
  .then(getPrayers)
  .then(setAlarms)
  .catch(error => {
    console.error(error);
  });
}


function getPrayers() {
  const schedule = {};

  return Promise.map(PRAYERS, prayer => {
    return db.get(prayer)
    .then(data => {
      schedule[prayer] = data.times.adhan;
    });
  }).return(schedule)
  .tap(schedule => {
    console.log("🕌  Got the adhan schedules: ");
    console.log(schedule);
  });
}

function getAdhan(prayer) {
  if (prayer === 'fajar') {
    return './adhan/fajar.mecca.mp3';
  }
  else {
    return './adhan/azan1.mp3';
  }
}

function setAlarms(schedule) {
  clock.clearAllAlarms();

  for (let prayer in schedule) {
    const time  = schedule[prayer];
    const adhan = getAdhan(prayer);

    clock.setAlarm(time, () => {
      console.log(`Playing ${prayer} Adhan`);
      player.play(adhan, function(err){
        if (err) throw err;
      });

      return scraper.update();
    });
  }
}


init();
