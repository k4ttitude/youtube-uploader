import { join, basename } from 'path'
import { lookup } from 'mime-types'
import { createInterface } from 'readline'
import { createReadStream } from 'fs'
import { google } from 'googleapis'
import { readdir, readFile } from 'fs/promises'
import inquirer from 'inquirer'
import { createSpinner } from 'nanospinner'
import chalk from 'chalk'

// google.options({ auth: 'AIzaSyALpieq8_5xjD7wIGLtaz-mLsMLrA7q464' })
const youtube = google.youtube('v3')

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
})

async function readCredentials(credPath) {
  const content = await readFile(credPath)
  return JSON.parse(content)
}

async function authorize(callback) {
  const { installed: keys } = await readCredentials(
    join(__dirname, 'oauth2.keys.json'),
  )
  const oauth2Client = new google.auth.OAuth2(
    keys.client_id,
    keys.client_secret,
    keys.redirect_uris[0],
  )

  const scopes = [
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtubepartner',
  ]
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
  })
  console.log('Authorize this app by visiting this url: ', authUrl)

  rl.question('Enter the code from that page here: ', function (code) {
    rl.close()
    oauth2Client.getToken(code, function (err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err)
        return
      }
      oauth2Client.credentials = token
      callback(oauth2Client)
    })
  })
}

function convertTitle(name) {
  const pattern =
    /^FIFA22_replay_(?<date>\d{4}.\d{2}.\d{2})-(?<hour>\d{2}).(?<min>\d{2})./
  const groups = name.match(pattern)?.groups
  if (!groups) {
    return null
  }
  const { date, hour, min } = groups
  return `FIFA 22 | ${date} ${hour}:${min}`
}

const sleep = (ms = 2000) => new Promise((r) => setTimeout(r, ms))
async function upload(filePath, auth) {
  const mimeType = lookup(filePath)
  const fileName = basename(filePath)
  const title = convertTitle(fileName)
  if (!title) {
    createSpinner(`${chalk.red('Ignored')} ${fileName}`).error()
    return
  }
  const spinner = createSpinner(`Uploading ${fileName}...`).start()
  await sleep(5000)
  spinner.success({
    text: `${chalk.greenBright('Uploaded')} ${convertTitle(fileName)}`,
  })
  // const stream = createReadStream(filePath)

  // try {
  //   const res = await youtube.videos.insert({
  //     auth,
  //     requestBody: { snippet: { title: '' } },
  //     part: 'status',
  //     media: {
  //       mimeType,
  //       body: stream,
  //     },
  //   })
  //   console.log(res.data)
  // } catch (e) {
  //   console.log('Error Uploading', e)
  // }
}

async function getFiles(auth) {
  const { folderPath } = await inquirer.prompt({
    name: 'folderPath',
    type: 'input',
    message: 'Enter folder path:',
  })
  const files = await readdir(folderPath)

  for (let filePath of files) {
    await upload(filePath, auth)
  }
}

getFiles()
// authorize(main)
