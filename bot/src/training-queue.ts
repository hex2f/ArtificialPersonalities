import { Message } from 'discord.js'
import { spawn } from 'child_process'
import path from 'path'
import log from './log.js'
class Queue {
  promises: Array<{promise: Promise<void>, resolve: Function}> = []

  get remaining (): number {
    return this.promises.length
  }

  async wait (): Promise<void> {
    const next = this.promises.length ? this.promises[this.promises.length - 1].promise : Promise.resolve()
    let resolve: Function = () => {}
    const promise: Promise<void> = new Promise(res => {
      resolve = res
    })

    this.promises.push({
      resolve,
      promise
    })

    return next
  }

  shift (): void {
    const deferred = this.promises.shift()
    if (typeof deferred !== 'undefined') deferred.resolve()
  }
}

class TrainingQueue {
  queue = new Queue()

  async run (id: string, message: Message): Promise<void> {
    const args = [
      'train.py',
      id
    ]
    const cwd = path.resolve('..')
    const child = spawn('python3', args, { cwd })
    const onData = (data: any): void => {
      const regex = /\s([0-9]+)\/([0-9]+)\s/g
      console.log(data.toString())
      const m = regex.exec(data.toString())
      function progressBar (percent: number): string {
        return `\`[${'■'.repeat(Math.ceil(percent / 5))}${' '.repeat(20 - Math.floor(percent / 5))}]\` ${Math.floor(percent)}%`
      }
      console.log(m)
      if (m && m.length === 3) {
        const [, current, total] = m
        if (isNaN(parseInt(current)) || isNaN(parseInt(total))) return
        void message.edit({
          embeds: [
            {
              title: '<:icons_spark:860123643722727444> Training personality...',
              description: progressBar((parseInt(current) / parseInt(total)) * 100),
              color: 0x5b9ef0
            }
          ]
        })
      }
    }
    child.stdout.on('data', onData)
    child.stderr.on('data', onData)
    child.on('exit', code => {
      if (code !== 0) {
        void message.edit({
          embeds: [
            {
              title: `<:icons_Correct:859388130411282442> Training failed with code ${code}`,
              color: 0xf73920
            }
          ]
        })
      } else {
        void message.edit({
          embeds: [
            {
              title: '<:icons_Correct:859388130411282442> Personality trained!',
              color: 0x5b9ef0
            }
          ]
        })
        void message.channel.send({
          embeds: [
            {
              title: '<:icons_shine1:859424400959602718> Personality has been activated!',
              color: 0x5b9ef0
            }
          ]
        })
      }
    })
  }

  async push (id: string, message: Message): Promise<void> {
    await this.queue.wait()
    try {
      await this.run(id, message)
    } finally {
      this.queue.shift()
    }
  }
}

export default new TrainingQueue()
