import './style.css';
import QRCode from 'qrcode';
import MersenneTwister from 'mersenne-twister';
import fireworks from 'fireworks';

type Stat = {
  a: number;
  b: number;
  c: number;
  hole: number;
  operator: '+';
  incorrect: number[];
};

const ui = {
  menu: document.querySelector<HTMLDivElement>('#menu')!,
  txtNumberSpace: document.querySelector<HTMLInputElement>('#txtNumberSpace')!,
  sldNumberSpace: document.querySelector<HTMLInputElement>('#sldNumberSpace')!,
  numberSpaceDisplay: document.querySelector<HTMLDivElement>(
    '#numberSpaceDisplay'
  )!,
  ckbIncludeZero: document.querySelector<HTMLInputElement>('#ckbIncludeZero')!,
  ckbAdd: document.querySelector<HTMLInputElement>('#ckbAdd')!,
  ckbSubtract: document.querySelector<HTMLInputElement>('#ckbSubtract')!,
  ckbMultiply: document.querySelector<HTMLInputElement>('#ckbMultiply')!,
  ckbDivide: document.querySelector<HTMLInputElement>('#ckbDivide')!,
  rbTime: document.querySelector<HTMLInputElement>('#rbTime')!,
  timeData: document.querySelector<HTMLDivElement>('#timeData')!,
  sldTime: document.querySelector<HTMLInputElement>('#sldTime')!,
  txtTime: document.querySelector<HTMLInputElement>('#txtTime')!,
  rbAmount: document.querySelector<HTMLInputElement>('#rbAmount')!,
  amountData: document.querySelector<HTMLDivElement>('#amountData')!,
  txtAmount: document.querySelector<HTMLInputElement>('#txtAmount')!,
  sldAmount: document.querySelector<HTMLInputElement>('#sldAmount')!,
  submit: document.querySelector<HTMLButtonElement>('#submit')!,
  app: document.querySelector<HTMLDivElement>('#app')!,
  a: document.querySelector<HTMLSpanElement>('#a')!,
  b: document.querySelector<HTMLSpanElement>('#b')!,
  c: document.querySelector<HTMLSpanElement>('#c')!,
  op: document.querySelector<HTMLSpanElement>('#op')!,
  qr: document.querySelector<HTMLCanvasElement>('#qr > canvas')!,
  numpad: document.querySelector<HTMLDivElement>('#numpad')!,
  progress: document.querySelector<HTMLProgressElement>('#app progress')!,
};
(ui.ckbMultiply.parentElement as HTMLDivElement).style.display = 'none';
(ui.ckbDivide.parentElement as HTMLDivElement).style.display = 'none';
(ui.ckbSubtract.parentElement as HTMLDivElement).style.display = 'none';

function getRandomHex(rng: MersenneTwister | null = null): string {
  let rand = rng ? rng.random() : Math.random();
  return Math.floor(rand * 0x10).toString(16);
}
function makeFirework() {
  const colors: string[] = [];
  const colorCount = 1 + Math.random() * 10;
  for (let i = 0; i < colorCount; i++) {
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += getRandomHex();
    }
    colors.push(color);
  }
  fireworks({
    x: window.innerWidth * 0.1 + Math.random() * window.innerWidth * 0.8,
    y: window.innerHeight * 0.1 + Math.random() * window.innerHeight * 0.8,
    colors,
  });
}
let interval = 0;
function start() {
  if (interval !== 0) {
    clearInterval(interval);
    interval = 0;
  }
  ui.menu.style.display = 'none';
  ui.app.style.display = 'flex';

  ui.numpad.innerHTML = '';
  let correctValue = 0;
  let gap: HTMLSpanElement = ui.a;

  // let firstGuess = true;
  //let solved = 0;
  // let incorrectGuesses = 0;
  // let distinctIncorrectGuesses = 0;
  const stat: Stat[] = [];

  const rng = new MersenneTwister(config.seed);
  const min = config.numberSpaceMin;
  const max = config.numberSpace + 1;

  if (config.mode === 'amount') {
    ui.progress.max = config.amount;
    ui.progress.value = 0;
  } else {
    ui.progress.max = config.time * 60;
    ui.progress.value = 0;
    interval = window.setInterval(() => {
      ui.progress.value++;
      if (ui.progress.value == ui.progress.max) {
        clearInterval(interval);
        interval = 0;
        finish(stat);
      }
    }, 1000);
  }

  const generateRandom = (minimum: number, maximum: number) => {
    return Math.floor(rng.random() * (maximum - minimum) + minimum);
  };

  let currStat: Stat;
  const generateCalc = () => {
    document.querySelector<HTMLBodyElement>('body')!.style.backgroundColor =
      '#' +
      Math.floor(Math.random() * 0x50 + 0x50).toString(16) +
      Math.floor(Math.random() * 0x50 + 0x50).toString(16) +
      Math.floor(Math.random() * 0x50 + 0x50).toString(16);
    const c = generateRandom(min + 1, max); //there are at least 2 numbers
    const a = generateRandom(min, c - config.numberSpaceMin);
    const b = c - a;
    const hole = generateRandom(0, 3);
    ui.op.innerText = '+';

    currStat = {
      a,
      b,
      c,
      hole,
      operator: '+',
      incorrect: [],
    };

    const spans = [ui.a, ui.b, ui.c];
    const vals = [a, b, c];

    for (let i = 0; i < 3; i++) {
      const val = vals[i];
      const span = spans[i];
      if (hole == i) {
        correctValue = val;
        gap = span;
        span.innerHTML = '&nbsp;';
      } else {
        span.innerText = val + '';
      }
      span.classList.toggle('hole', hole == i);
    }
  };
  const buttons: HTMLButtonElement[] = [];
  for (let i = config.numberSpaceMin; i < config.numberSpace + 1; i++) {
    const btn = document.createElement('button');
    buttons.push(btn);
    const val = i;
    btn.innerText = i + '';
    btn.setAttribute('data-value', i + '');
    btn.addEventListener('click', () => {
      if (correctValue == val) {
        gap.classList.remove('incorrect');
        stat.push(currStat);
        generateCalc();
        {
          //Firework
          const amount = Math.random() * 5;
          makeFirework();
          for (let i = 0; i < amount; i++) {
            setTimeout(makeFirework, Math.random() * 1000);
          }
        }
        if (config.mode === 'amount') ui.progress.value = stat.length;
        if (config.mode === 'amount' && stat.length == config.amount)
          finish(stat);
      } else {
        currStat.incorrect.push(val);
        buttons.forEach((x) => (x.disabled = true));
        gap.classList.add('incorrect');
        gap.addEventListener('animationend', () => {
          buttons.forEach((x) => (x.disabled = false));
          gap.classList.remove('incorrect');
        });
      }
    });
    ui.numpad.append(btn);
  }

  generateCalc();
}

type Config = {
  numberSpace: number;
  numberSpaceMin: number;
  mode: 'time' | 'amount';
  time: number;
  amount: number;
  seed: number; //TODO
};

const config: Config = {
  numberSpace: 10,
  numberSpaceMin: 0,
  mode: 'time',
  amount: 10,
  time: 1,
  seed: new Date().getTime(),
};
updateConfig();
function finish(stat: Stat[]): void {
  location.hash = '#';
  console.log('DONE', stat);
}
function updateConfig(input: HTMLInputElement | null = null) {
  if (input) {
    if ([ui.sldNumberSpace, ui.txtNumberSpace].indexOf(input) >= 0)
      config.numberSpace = +input.value;
    else if ([ui.ckbIncludeZero].indexOf(input) >= 0)
      config.numberSpaceMin = input.checked ? 0 : 1;
    else if ([ui.sldTime, ui.txtTime].indexOf(input) >= 0)
      config.time = +input.value;
    else if ([ui.sldAmount, ui.txtAmount].indexOf(input) >= 0)
      config.amount = +input.value;
    else if (
      ui.rbTime === input &&
      input.value === 'time' &&
      config.mode !== 'time'
    )
      config.mode = 'time';
    else if (
      ui.rbAmount === input &&
      input.value === 'amount' &&
      config.mode !== 'amount'
    )
      config.mode = 'amount';
  }

  if (ui.sldNumberSpace.value !== config.numberSpace + '')
    ui.sldNumberSpace.value = config.numberSpace + '';
  if (ui.txtNumberSpace.value !== config.numberSpace + '')
    ui.txtNumberSpace.value = config.numberSpace + '';
  if (ui.ckbIncludeZero.checked !== (config.numberSpaceMin === 0))
    ui.ckbIncludeZero.checked = config.numberSpaceMin === 0;
  if (config.mode === 'amount') {
    ui.rbAmount.checked = true;
    ui.rbTime.checked = false;
  } else {
    ui.rbTime.checked = true;
    ui.rbAmount.checked = false;
  }
  if (ui.sldTime.value !== config.time + '')
    ui.sldTime.value = config.time + '';
  if (ui.txtTime.value !== config.time + '')
    ui.txtTime.value = config.time + '';
  if (ui.sldAmount.value !== config.amount + '')
    ui.sldAmount.value = config.amount + '';
  if (ui.txtAmount.value !== config.amount + '')
    ui.txtAmount.value = config.amount + '';
  ui.numberSpaceDisplay.innerHTML = '<span></span>'.repeat(config.numberSpace);

  QRCode.toCanvas(ui.qr, getUrl());
}
function getUrl(): string {
  let url = '';
  url = location.href.split('#')[0];
  url += '#' + decodeURIComponent(JSON.stringify(config));
  return url;
}

const menuInputs = [
  ui.txtNumberSpace,
  ui.sldNumberSpace,
  ui.ckbIncludeZero,
  ui.rbTime,
  ui.sldTime,
  ui.txtTime,
  ui.rbAmount,
  ui.txtAmount,
  ui.sldAmount,
  ui.ckbAdd,
  ui.ckbSubtract,
  ui.ckbDivide,
  ui.ckbMultiply,
];
for (const input of menuInputs) {
  const listener = () => {
    updateConfig(input);
  };
  input.addEventListener('change', listener);
  input.addEventListener('blur', listener);
  input.addEventListener('click', listener);
}

ui.submit.addEventListener('click', () => {
  location.href = '#' + JSON.stringify(config);
});

function onHashChange() {
  let data = window.location.hash;
  if (data) data = decodeURIComponent(data.substring(1));
  if (data) {
    try {
      const tmp = JSON.parse(data);
      Object.assign(config, tmp);
    } catch {}
    start();
  } else {
    ui.app.style.display = 'none';
    ui.menu.style.display = '';
  }
}
window.addEventListener('hashchange', onHashChange);
if (window.location.hash?.length > 1) onHashChange();
