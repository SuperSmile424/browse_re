import path from 'path';
import shallow from '../../../src/input/shallow.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('shallow deps', async function () {
  const deps = await shallow(
    [path.resolve(path.join(__dirname, '../../fixture/es6.input.js'))],
    {}
  );
  expect(deps.length).toBe(1);
  expect(deps[0]).toBeTruthy();
});

test('shallow deps multi', async function () {
  const deps = await shallow(
    [
      path.resolve(path.join(__dirname, '../../fixture/es6.input.js')),
      path.resolve(path.join(__dirname, '../../fixture/simple.input.js'))
    ],
    {}
  );
  expect(deps.length).toBe(2);
  expect(deps[0]).toBeTruthy();
});

test('shallow deps directory', async function () {
  const deps = await shallow(
    [path.resolve(path.join(__dirname, '../../fixture/html'))],
    {}
  );
  expect(deps.length).toBe(1);
  expect(deps[0].file.match(/input.js/)).toBeTruthy();
});

test('shallow deps literal', async function () {
  const obj = {
    file: 'foo.js',
    source: '//bar'
  };
  const deps = await shallow([obj], {});
  expect(deps[0]).toBe(obj);
});
