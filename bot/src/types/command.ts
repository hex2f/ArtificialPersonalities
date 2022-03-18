import { ApplicationCommandDataResolvable, CommandInteraction } from 'discord.js'

export type Command = Partial<ApplicationCommandDataResolvable> & { handler: (interaction: CommandInteraction) => Promise<void> }
