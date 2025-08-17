import * as inquirer from 'inquirer'
import { Logger } from '../logger'

const logger = new Logger('INTERNAL', {
  loggerType: 'console',
})

const prompt = inquirer.createPromptModule()

async function getPasswordFromTerminal(
  text?: string,
  reEnterText?: string,
  validateFunction?: (value: string) => boolean,
  mask: string | boolean = '*'
) {
  let askPassword = true
  let password = ''
  while (askPassword) {
    let answers = await prompt([
      {
        type: 'password',
        message: text || `Enter Your Password`,
        name: 'password',
        validate: validateFunction
          ? (value: string) => validateFunction(value) || 'incorrect value'
          : undefined,
        mask,
      },
      {
        type: 'password',
        message: reEnterText || 'Enter Your Password Again',
        name: 'rePassword',
        mask,
      },
    ])
    if (answers.password !== answers.rePassword) {
      logger.error("passwords doesn't matched. try again")
    } else {
      askPassword = false
      password = answers.password
    }
  }
  return password
}

async function getSecretFromTerminal(
  text?: string,
  validateFunction?: (value: string) => boolean,
  mask: string | boolean = '*'
) {
  let answers = await prompt([
    {
      type: 'password',
      message: text || `Enter Your Secret`,
      name: 'data',
      validate: validateFunction
        ? (value: string) => validateFunction(value) || 'incorrect value'
        : undefined,
      mask,
    },
  ])
  return answers.data
}

async function getInputFromTerminal(
  text?: string,
  defaultValue?: string,
  validateFunction?: (value: string) => boolean
) {
  let answers = await prompt([
    {
      type: 'input',
      message: text || `Enter Your Number`,
      name: 'input',
      validate: validateFunction
        ? (value: string) => validateFunction(value) || 'incorrect value'
        : undefined,
      default: defaultValue,
    },
  ])
  return answers.input
}

async function doYouWantToContinue(message: string, defaultValue = false) {
  let answers = await prompt([
    {
      type: 'confirm',
      name: 'response',
      message: `${message}. Do you want to continue?`,
      default: defaultValue,
    },
  ])

  if (answers.response === true) return
  throw new Error('answer is no')
}

async function yesOrNo(message: string, defaultValue = false) {
  let answers = await prompt([
    {
      type: 'confirm',
      name: 'response',
      message: `${message} ?`,
      default: defaultValue,
    },
  ])

  if (answers.response === true) return true
  return false
}

export {
  getPasswordFromTerminal,
  getSecretFromTerminal,
  doYouWantToContinue,
  yesOrNo,
  getInputFromTerminal,
}
