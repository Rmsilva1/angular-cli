import 'reflect-metadata';

import {IndentLogger, Logger, LogEntry} from '@ngtools/logger';
import {bold, red, yellow, white} from 'chalk';
import * as minimist from 'minimist';
import {ReflectiveInjector, Injectable, Inject, OpaqueToken} from '@angular/core';

import {SlackBot} from './slackbot';

import 'rxjs/add/operator/filter';


const argv = minimist(process.argv.slice(2), {
  boolean: ['verbose']
});

const rootLogger = new IndentLogger('cling');

rootLogger
  .filter((entry: LogEntry) => (entry.level != 'debug' || argv.verbose))
  .subscribe((entry: LogEntry) => {
    let color: (s: string) => string = white;
    let output = process.stdout;
    switch (entry.level) {
      case 'info': color = white; break;
      case 'warn': color = yellow; break;
      case 'error': color = red; output = process.stderr; break;
      case 'fatal': color = (x: string) => bold(red(x)); output = process.stderr; break;
    }
console.log(entry);
    output.write(color(entry.message) + '\n');
  });
rootLogger
  .filter((entry: LogEntry) => entry.level == 'fatal')
  .subscribe(() => {
    process.stderr.write('A fatal error happened. See details above.');
    process.exit(100);
  });


if (!process.env.SLACK_TOKEN) {
  console.error('Need to declare SLACK_TOKEN.');
  process.exit(1);
}
if (!process.env.GITHUB_TOKEN) {
  console.error('Need to declare GITHUB_TOKEN.');
  process.exit(2);
}


// const bot = new SlackBot({
//   token: process.env.SLACK_TOKEN,
//   name: 'cli-bot'
// });


const rootInjector = ReflectiveInjector.resolveAndCreate([
  { provide: Logger, useFactory: (name: string) => new Logger(name, rootLogger),
    deps: [Object] },
]);


@Injectable()
class Bot {
  constructor(public logger: Logger) {
    logger.info('hello world');
  }
}


const bot = rootInjector.resolveAndInstantiate(Bot);

//
//
// bot.on('start', () => {
//   console.log('Running...');
//
//   const params: any = {
//     icon_emoji: ':github:'
//   };
//   bot.postMessageToUser('hansl', 'meow!', params)
//     .catch(err => {
//       console.error(err);
//       process.exit(1);
//     });
//
//   bot.on('message', (content) => {
//     console.log(content);
//   });
//   // bot.getChannels().then(channels => console.log(channels))
// });
