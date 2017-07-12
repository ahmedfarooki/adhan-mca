'use strict';

const Promise   = require('bluebird');
const request   = require('request');
const cheerio   = require('cheerio');
const trim      = require('trim');
const PouchDB   = require('pouchdb');
const md5       = require('md5');
const _         = require('lodash');

const config    = require('./config')

const UA  = 'Mozilla/5.0 (iPhone; CPU iPhone OS 11 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) CriOS/56.0.2924.75 Mobile/14E5239e Safari/602.1';
const URL = 'http://mcabayarea.org';

const options = {
  uri: URL,
  headers: {
    'User-Agent': UA
  }
};

const timeRegex = /^\d{1,2}:\d{1,2}/;
const prayerTimes = [];


const db = new PouchDB('prayers.db');


db.save = function(data) {
  return db.get(data._id)
  .then(doc => {
    data._rev = doc._rev;
    return db.put(data);
  })
  .catch(error => {
    if (error.status === 404) {
      return db.put(data);
    }
    throw error;
  });
}


function formatTime(time) {
  let HH = parseInt(time, 10);
  let MM = time.slice(-2);

  if (HH < 11) {
    HH += 12;
  }

  return `${HH}:${MM}`
}


function parseTimes(times) {
  const hash = md5(JSON.stringify(prayerTimes));

  const prayerLabels = [
    'fajarAdhan',
    'fajarSalaat',
    'sunrise',
    'dhuhrAdhan',
    'dhuhrSalaat',
    'asrAdhan',
    'asrSalaat',
    'maghrib',
    'ishaaAdhan',
    'ishaaSalaat',
    'jumaa1',
    'iqama1',
    'jumaa2',
    'iqama2',
    'jumaa3',
    'iqama3'
  ];

  const prayerMap = {};
  times.forEach((entry, n) => {
    prayerMap[prayerLabels[n]] = entry;
  });

  const prayers = [];
  prayers.push({
    _id: 'fajar',
    times: {
      adhan:   ('0' + prayerMap.fajarAdhan).slice(-5),
      salaat:  ('0' + prayerMap.fajarSalaat).slice(-5),
      sunrise: ('0' + prayerMap.sunrise).slice(-5)
    }
  });

  prayers.push({
    _id: 'dhuhr',
    times: {
      adhan:  formatTime(prayerMap.dhuhrAdhan),
      salaat: formatTime(prayerMap.dhuhrSalaat)
    }
  });

  prayers.push({
    _id: 'asr',
    times: {
      adhan:  formatTime(prayerMap.asrAdhan),
      salaat: formatTime(prayerMap.asrSalaat)
    }
  });

  prayers.push({
    _id: 'maghrib',
    times: {
      adhan:  formatTime(prayerMap.maghrib),
      salaat: formatTime(prayerMap.maghrib)
    }
  });

  prayers.push({
    _id: 'ishaa',
    times: {
      adhan:  formatTime(prayerMap.ishaaAdhan),
      salaat: formatTime(prayerMap.ishaaSalaat)
    }
  });

  prayers.push({
    _id: 'meta',
    data: {
      hash,
      updated_at: new Date()
    }
  });

  return prayers;
}

function scrapePrayerTimes() {
  return new Promise((resolve, reject) => {
    request(URL, function(error, response, html) {
      if (error) {
        console.error('Error:', error);
        return reject(new Error(error));
      }
      else {
        const $ = cheerio.load(html);

        const p2 = $('.Prayer02');
        p2.each(function(i, element) {
          if (element.children.length) {
            const children = element.children;
            children.forEach(function(child, i) {
              if (child.type === 'tag' && child.name === 'font') {
                const fontChildren = child.children;
                fontChildren.forEach(function(fontChild, i) {
                  if (fontChild.type === 'text' && timeRegex.test(fontChild.data)) {
                    prayerTimes.push(trim(fontChild.data));
                  }
                });
              }
              else if (child.type === 'text' && timeRegex.test(child.data)) {
                prayerTimes.push(trim(child.data));
              }
            });
          }
        });

        return resolve(prayerTimes);
      }
    });
  });
}

function savePrayers(prayers) {
  return Promise.mapSeries(prayers, row => {
    return db.save(row);
  })
  .then(() => {
    console.log("Saved prayer times.");
  });
}

function getSavedHash() {
  return db.get('meta')
  .then(meta => {
    return meta.data.hash;
  })
  .catch(error => {
    if (error.status === 404) {
      return null;
    }
    throw error;
  });
}

function getUpdatedAt() {
  return db.get('meta')
  .then(meta => {
      return meta.data.updated_at;
  })
  .catch(error => {
    if (error.status === 404) {
      return null;
    }
    throw error;
  });
}


function update() {
  let changes = false;

  return lastUpdatedAt()
  .then(minutes => {
    if (minutes !== null && minutes < config.MINIMUM_MINUTES) {
      throw new Error('Skipping updating prayer schedule, too soon to try.');
    }
    return scrapePrayerTimes()
  })
  .then(parseTimes)
  .then(prayers => {
    const hash = _.find(prayers, ['_id', 'meta']).data.hash;

    return getSavedHash()
    .then(savedHash => {
      if (savedHash === hash) {
        console.log("No changes in prayer times.");
      }
      else {
        changes = true;
      }
      return savePrayers(prayers);
    })
  })
  .then(() => changes)
  .catch(error => {
    if (error.message === 'Skipping updating prayer schedule, too soon to try.') {
      console.log(error.message);
    }
    else {
      console.error(error);
    }
  });
}

function lastUpdatedAt() {
  return getUpdatedAt()
  .then(updated_at => {
    if (updated_at) {
      const date = new Date(updated_at);
      // returns minutes since last update
      return Math.floor((Date.now() - date.getTime()) / (1000 * 60));
    }
    else {
      return null;
    }
  });
}


module.exports = {
  update
};
