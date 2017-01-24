import test from 'ava'
import { select, put } from 'redux-saga/effects'
const stepper = (fn) => (mock) => fn.next(mock).value

test('watches for the right action', (t) => {
  const step = stepper(startup())

})
