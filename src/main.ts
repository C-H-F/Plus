import './style.css';
import QRCode from 'qrcode';
import MersenneTwister from 'mersenne-twister';
import fireworks from 'fireworks';

type Stat = {
  a: number;
  b: number;
  c: number;
  hole: number;
  operator: Operator;
  incorrect: number[];
  startTime: Date;
  endTime: Date | null;
};

const ui = {
  menu: document.querySelector<HTMLDivElement>('#menu')!,
  numbers: new Array(101)
    .fill(undefined)
    .map((_, i) => document.querySelector<HTMLInputElement>('#rb' + i)!),
  btnBack: document.querySelector<HTMLAnchorElement>('#btnBack')!,
  ckbAddA: document.querySelector<HTMLInputElement>('#ckbAddA')!,
  ckbAddB: document.querySelector<HTMLInputElement>('#ckbAddB')!,
  ckbAddC: document.querySelector<HTMLInputElement>('#ckbAddC')!,
  ckbSubtractA: document.querySelector<HTMLInputElement>('#ckbSubtractA')!,
  ckbSubtractB: document.querySelector<HTMLInputElement>('#ckbSubtractB')!,
  ckbSubtractC: document.querySelector<HTMLInputElement>('#ckbSubtractC')!,
  ckbMultiplyA: document.querySelector<HTMLInputElement>('#ckbMultiplyA')!,
  ckbMultiplyB: document.querySelector<HTMLInputElement>('#ckbMultiplyB')!,
  ckbMultiplyC: document.querySelector<HTMLInputElement>('#ckbMultiplyC')!,
  ckbDivideA: document.querySelector<HTMLInputElement>('#ckbDivideA')!,
  ckbDivideB: document.querySelector<HTMLInputElement>('#ckbDivideB')!,
  ckbDivideC: document.querySelector<HTMLInputElement>('#ckbDivideC')!,
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
ui.btnBack.onclick = (evt) => {
  if (!confirm('Do you really want to go back to main menu?')) {
    evt.preventDefault();
    return false;
  }
  cleanup();
  location.href = '#';
  return true;
};

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
function toOperatorSign(op: Operator): string {
  if (op === Operator.Subtract) return '-';
  if (op === Operator.Multiply) return '·';
  if (op === Operator.Divide) return ':';
  return '+';
}
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

  const stat: Stat[] = [];
  if (
    config.gaps[Gap.A] === Operator.None &&
    config.gaps[Gap.B] === Operator.None &&
    config.gaps[Gap.C] === Operator.None
  ) {
    config.gaps[Gap.C] = Operator.Add;
    config.gaps[Gap.C] = Operator.Subtract;
  }
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
        cleanup();
        finish(stat);
      }
    }, 1000);
  }

  const generateRandom = (minimum: number, maximum: number) => {
    return Math.floor(rng.random() * (maximum - minimum) + minimum);
  };

  const operatorCount = Math.log(Operator.INVALID) / Math.log(2);
  const calcTypes = [] as { operator: Operator; gap: Gap }[];
  for (let gap = 0; gap < config.gaps.length; gap++) {
    for (let i = 0; i < operatorCount; i++) {
      const operator = (1 << i) as Operator;
      if ((config.gaps[gap] & operator) == 0) continue;
      calcTypes.push({ operator, gap });
    }
  }
  if (calcTypes.length === 0)
    calcTypes.push({ operator: Operator.Add, gap: Gap.C });

  let currStat: Stat;
  const generateCalc = () => {
    document.querySelector<HTMLBodyElement>('body')!.style.backgroundColor =
      '#' +
      Math.floor(Math.random() * 0x50 + 0x50).toString(16) +
      Math.floor(Math.random() * 0x50 + 0x50).toString(16) +
      Math.floor(Math.random() * 0x50 + 0x50).toString(16);
    let a = 0;
    let b = 0;
    let c = 0;
    const { operator, gap: hole } =
      calcTypes[generateRandom(0, calcTypes.length)];
    ui.op.innerText = '+';

    if (operator === Operator.Subtract) {
      a = generateRandom(min + 1, max);
      b = generateRandom(min + 1, max);
      if (b > a) {
        const tmp = a;
        a = b;
        b = tmp;
      }
      c = a - b;
    } else if (operator === Operator.Multiply || operator === Operator.Divide) {
      a = generateRandom(min, Math.floor(Math.sqrt(max)) + 1);
      b = generateRandom(min, Math.floor(Math.sqrt(max)) + 1);
      c = a * b;
      if (operator === Operator.Divide) {
        [a, c] = [c, a];
      }
    } else {
      //(operator === Operator.Add) {
      c = generateRandom(min + 1, max); //there are at least 2 numbers
      a = generateRandom(min, c - config.numberSpaceMin);
      b = c - a;
    }
    currStat = {
      a,
      b,
      c,
      hole,
      operator,
      incorrect: [],
      startTime: new Date(),
      endTime: null,
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
    ui.op.innerText = toOperatorSign(operator);
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
        currStat.endTime = new Date();
        const errors = currStat.incorrect.length;
        stat.push(currStat);
        generateCalc();
        if (!errors) {
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
enum Operator {
  None = 0,
  Add = 1,
  Subtract = 2,
  Multiply = 4,
  Divide = 8,
  INVALID = 16,
}
enum Gap {
  A = 0,
  B = 1,
  C = 2,
  MAX = 4,
}

type Config = {
  numberSpace: number;
  numberSpaceMin: number;
  mode: 'time' | 'amount';
  time: number;
  amount: number;
  seed: number;
  gaps: [Operator, Operator, Operator]; //Defines what gap can be used by which operator.
};

const config: Config = {
  numberSpace: 10,
  numberSpaceMin: 0,
  mode: 'amount',
  amount: 10,
  time: 1,
  seed: new Date().getTime(),
  gaps: [Operator.None, Operator.None, Operator.Add | Operator.Subtract],
};
updateConfig();
function cleanup() {
  clearInterval(interval);
  interval = 0;
}
function finish(stat: Stat[]): void {
  config.seed = new Date().getTime();
  console.log('DONE', stat);

  ui.app.style.display = 'none';

  let errors = 0;
  let correctCalculations = 0;
  let duration = 0;
  for (const entry of stat) {
    const currErrors = entry.incorrect.length;
    errors += currErrors;
    if (currErrors == 0) correctCalculations++;
  }
  if (stat.length > 0)
    duration =
      (new Date(
        stat[stat.length - 1].endTime ?? stat[stat.length - 1].startTime
      ).getTime() -
        new Date(stat[0].startTime).getTime()) /
      1000;

  const div = document.createElement('div');
  div.classList.add('statistics');
  {
    const elem = document.createElement('a');
    elem.id = 'btnBack';
    elem.innerText = `<`;
    elem.addEventListener('click', (evt) => {
      evt.preventDefault();
      div.remove();
      location.href = '#';
    });
    elem.href = '#';
    div.append(elem);
  }
  {
    const pick = (arg: string[]) => {
      return arg[Math.floor(Math.random() * arg.length)];
    };
    const r = correctCalculations / stat.length;
    const elem = document.createElement('p');
    elem.className = 'grade';
    if (r > 0.91) {
      elem.innerText = pick(['😀', '🤩', '😎']);
      elem.title = '1';
    } else if (r > 0.81) {
      elem.innerText = pick(['😉', '😊', '🙂']);
      elem.title = '2';
    } else if (r > 0.66) {
      elem.innerText = '🤨';
      elem.title = '3';
    } else if (r > 0.5) {
      elem.innerText = '😟';
      elem.title = '4';
    } else {
      elem.innerText = '😭';
      elem.title = '5';
    }
    div.append(elem);
  }
  {
    const elem = document.createElement('p');
    elem.innerText = `✅: ${correctCalculations} / ${stat.length}`;
    div.append(elem);
  }
  {
    const elem = document.createElement('p');
    elem.innerText = `❌: ${errors}`;
    div.append(elem);
  }
  {
    const elem = document.createElement('p');
    elem.innerText = `⏱: ~${
      Math.round((duration / (stat.length || 1)) * 10) / 10
    } seconds per calculation`;
    div.append(elem);
  }
  for (const calc of stat) {
    const elem = document.createElement('div');
    const h2 = document.createElement('h2');
    {
      const span = document.createElement('span');
      if (calc.hole == Gap.A) span.className = 'gap';
      span.innerText = ' ' + calc.a + ' ';
      h2.append(span);
    }
    {
      const span = document.createElement('span');
      span.innerText = ' ' + toOperatorSign(calc.operator) + ' ';
      h2.append(span);
    }
    {
      const span = document.createElement('span');
      if (calc.hole == Gap.B) span.className = 'gap';
      span.innerText = ' ' + calc.b + ' ';
      h2.append(span);
    }
    {
      const span = document.createElement('span');
      span.innerText = ' = ';
      h2.append(span);
    }
    {
      const span = document.createElement('span');
      if (calc.hole == Gap.C) span.className = 'gap';
      span.innerText = ' ' + calc.c + ' ';
      h2.append(span);
    }
    {
      const span = document.createElement('span');
      span.className = 'succ';
      span.innerText = calc.incorrect.length == 0 ? ' ✔' : ' ❌';
      h2.append(span);
    }
    div.append(h2);
    if (calc.endTime) {
      const elem = document.createElement('p');
      elem.innerText = `${
        Math.round((calc.endTime.getTime() - calc.startTime.getTime()) / 100) /
        10
      }s`;
      div.append(elem);
    }
    if (calc.incorrect.length > 0) {
      const elem = document.createElement('p');
      elem.innerText = 'Incorrect values: ' + calc.incorrect.join(', ');
      div.append(elem);
    }
    div.append(elem);
  }
  const button = document.createElement('button');
  button.innerText = 'OK';
  button.className = 'ok';
  button.addEventListener('click', () => {
    location.href = '#';
    div.remove();
  });
  div.append(button);

  document.body.append(div);
}
function updateConfig(input: HTMLInputElement | null = null) {
  const uiOperators = [
    ui.ckbAddA,
    ui.ckbAddB,
    ui.ckbAddC,
    ui.ckbSubtractA,
    ui.ckbSubtractB,
    ui.ckbSubtractC,
    ui.ckbMultiplyA,
    ui.ckbMultiplyB,
    ui.ckbMultiplyC,
    ui.ckbDivideA,
    ui.ckbDivideB,
    ui.ckbDivideC,
  ] as HTMLInputElement[];
  if (input) {
    if ((input.checked && input.name === 'start') || input.name === 'end') {
      const number = ui.numbers.indexOf(input);
      if (number >= 0) {
        if (input.name === 'start') config.numberSpaceMin = number;
        else config.numberSpace = number;
      }
    }
    if ([ui.sldTime, ui.txtTime].indexOf(input) >= 0)
      config.time = +input.value;
    else if ([ui.sldAmount, ui.txtAmount].indexOf(input) >= 0)
      config.amount = +input.value;
    else if (uiOperators.indexOf(input) >= 0) {
      for (let i = 0; i < Gap.MAX; i++) {
        config.gaps[i] = Operator.None;
      }
      for (let i = 0; i < uiOperators.length; i++) {
        const operatorIndex = Math.floor(i / 3);
        const gapIndex = i % 3;
        if (uiOperators[i].checked) config.gaps[gapIndex] |= 1 << operatorIndex;
      }
    } else if (
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
  ui.numbers.map(
    (v, i) =>
      (v.checked = i === config.numberSpaceMin || i === config.numberSpace)
  );
  for (let i = 0; i < uiOperators.length; i++) {
    const operatorIndex = Math.floor(i / 3);
    const gapIndex = i % 3;
    const gap = uiOperators[i];
    gap.checked =
      (config.gaps[gapIndex] & (1 << (operatorIndex as Operator))) !=
      Operator.None;
  }
  const url = getUrl();
  QRCode.toCanvas(ui.qr, url);
  console.log(url);
}
function getUrl(): string {
  let url = '';
  url = location.href.split('#')[0];
  url += '#' + decodeURIComponent(JSON.stringify(config));
  return url;
}

const menuInputs = [
  ...ui.numbers,
  ui.rbTime,
  ui.sldTime,
  ui.txtTime,
  ui.rbAmount,
  ui.txtAmount,
  ui.sldAmount,
  ui.ckbAddA,
  ui.ckbAddB,
  ui.ckbAddC,
  ui.ckbSubtractA,
  ui.ckbSubtractB,
  ui.ckbSubtractC,
  ui.ckbDivideA,
  ui.ckbDivideB,
  ui.ckbDivideC,
  ui.ckbMultiplyA,
  ui.ckbMultiplyB,
  ui.ckbMultiplyC,
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
