const stdTTL = 43200; // 12 hours (in seconds)

const got = require('got');
const cheerio = require('cheerio');
const NodeCache = require( "node-cache" );
const cache = new NodeCache({ stdTTL, checkperiod: 120 });
const sound = require("sound-play");

class Adhan {
  constructor() {
    this.init();
  }

  async init() {
    await this.updateTimes();
    await this.checkForAdhan();

    setInterval(this.updateTimes.bind(this), 162000000);
    setInterval(this.checkForAdhan.bind(this), 60000);
  }

  async updateTimes() {
    console.log('Getting Adhan times from MCA');

    const body = await this.scrape();
    const adhanTimes = this.extractAdhanTimes(body);
    this.saveAdhanTimes(adhanTimes);
  };

  getTime() {
    const date = new Date();

    const getHours = () => {
      const hours = date.getHours() > 12 ? date.getHours() - 12 : date.getHours();
      return hours.toString().length === 1 ? `0${hours}` : hours;
    };

    const hours = getHours();
    const minutes = date.getMinutes().toString().length === 1 ? `0${date.getMinutes()}` : date.getMinutes();
    const meridiem = date.getHours() > 11 ? 'PM' : 'AM';

    return `${hours}:${minutes} ${meridiem}`;
  }

  getAdhan(prayer) {
    if (prayer === 'fajr') {
      return './adhan/fajar.mecca.mp3';
    }
    else {
      return './adhan/azan1.mp3';
    }
  }

  async playAdhan(prayer) {
    if (this.playingAdhan) return;
    this.playingAdhan = prayer;

    const adhan = this.getAdhan(prayer);
    try {
      await sound.play(adhan);
      this.playingAdhan = null;
    }
    catch (error) {
      console.error(error);
    }
  }


  async checkForAdhan() {
    const time = this.getTime();
    const prayer = cache.get(time);

    if (prayer) {
      console.log(`[${time}] Time for ${prayer}`);
      await this.playAdhan(prayer);
    }
    else {
      console.log(`[${time}] No-op`);
    }
  }


  async scrape() {
    const UA  = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36';
    const URL = 'http://mcabayarea.org';

    const options = {
      headers: {
        'user-agent': UA,
      },
    };

    const { body } = await got(URL, options);
    return body;
  }

  extractAdhanTimes(body) {
    const $ = cheerio.load(body);

    const extractTime = (text) => text.substr(0, text.length/2);

    // For Debugging:
    // const prayerTimes = $('.prayertime tr:nth-child(2)').html();

    const fajr = extractTime($('.prayertime tr:nth-child(2) td:nth-child(2)').text());
    const dhuhr = extractTime($('.prayertime tr:nth-child(2) td:nth-child(4)').text());
    const asr = extractTime($('.prayertime tr:nth-child(2) td:nth-child(5)').text());
    const maghrib = extractTime($('.prayertime tr:nth-child(2) td:nth-child(6)').text());
    const isha = extractTime($('.prayertime tr:nth-child(2) td:nth-child(7)').text());

    const adhanTimes = { fajr, dhuhr, asr, maghrib, isha };
    console.log(adhanTimes);

    return adhanTimes;
  }

  saveAdhanTimes(adhanTimes) {
    Object.keys(adhanTimes).forEach(prayer => {
      cache.set(adhanTimes[prayer], prayer);
    });
  };
}

modules.export = Adhan;