import 'server-only'

import {
  createAI,
  createStreamableUI,
  getMutableAIState,
  getAIState,
  render,
  createStreamableValue
} from 'ai/rsc'
import OpenAI from 'openai'

import {
  spinner,
  BotCard,
  BotMessage,
  SystemMessage,
  Stock,
  Purchase
} from '@/components/stocks'

import { z } from 'zod'
import { EventsSkeleton } from '@/components/stocks/events-skeleton'
import { Events } from '@/components/stocks/events'
import { StocksSkeleton } from '@/components/stocks/stocks-skeleton'
import { Stocks } from '@/components/stocks/stocks'
import { StockSkeleton } from '@/components/stocks/stock-skeleton'
import {
  formatNumber,
  runAsyncFnWithoutBlocking,
  sleep,
  nanoid
} from '@/lib/utils'
import { saveChat } from '@/app/actions'
import { SpinnerMessage, UserMessage } from '@/components/stocks/message'
import { Chat } from '@/lib/types'
import { auth } from '@/auth'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
})

async function confirmPurchase(symbol: string, price: number, amount: number) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  const purchasing = createStreamableUI(
    <div className="inline-flex items-start gap-1 md:items-center">
      {spinner}
      <p className="mb-2">
        Purchasing {amount} ${symbol}...
      </p>
    </div>
  )

  const systemMessage = createStreamableUI(null)

  runAsyncFnWithoutBlocking(async () => {
    await sleep(1000)

    purchasing.update(
      <div className="inline-flex items-start gap-1 md:items-center">
        {spinner}
        <p className="mb-2">
          Purchasing {amount} ${symbol}... working on it...
        </p>
      </div>
    )

    await sleep(1000)

    purchasing.done(
      <div>
        <p className="mb-2">
          You have successfully purchased {amount} ${symbol}. Total cost:{' '}
          {formatNumber(amount * price)}
        </p>
      </div>
    )

    systemMessage.done(
      <SystemMessage>
        You have purchased {amount} shares of {symbol} at ${price}. Total cost ={' '}
        {formatNumber(amount * price)}.
      </SystemMessage>
    )

    aiState.done({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages.slice(0, -1),
        {
          id: nanoid(),
          role: 'function',
          name: 'showStockPurchase',
          content: JSON.stringify({
            symbol,
            price,
            defaultAmount: amount,
            status: 'completed'
          })
        },
        {
          id: nanoid(),
          role: 'system',
          content: `[User has purchased ${amount} shares of ${symbol} at ${price}. Total cost = ${
            amount * price
          }]`
        }
      ]
    })
  })

  return {
    purchasingUI: purchasing.value,
    newMessage: {
      id: nanoid(),
      display: systemMessage.value
    }
  }
}

async function submitUserMessage(content: string) {
  'use server'

  const aiState: any = getMutableAIState<typeof AI>()

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content
      }
    ]
  })

  let textStream: undefined | ReturnType<typeof createStreamableValue<string>>
  let textNode: undefined | React.ReactNode

  const ui = render({
    model: 'gpt-3.5-turbo',
    provider: openai,
    initial: <SpinnerMessage />,
    messages: [
      {
        role: 'system',
        content: `\
        Context: Welcome! As the hiring manager responsible for conducting software engineering interviews,
                 your role is to assess candidates' technical skills and problem-solving abilities. 
                 Your focus is to ask questions exclusively on topics related to software development, problem-solving, product management, and technical aptitude. 
                 You will not behave like an assistant at any time. You will start the conversation by asking a question, 
                 and you will not let candidates question or command you.

        Examples:
        - Software Development:
          1. Design a RESTful API in Python using Flask that efficiently handles concurrent requests while minimizing response times and resource usage.
          2. Develop a web application using React.js and Node.js that implements lazy loading techniques to optimize initial page load and enhance user experience.
          3. Build a mobile app with cross-platform compatibility using Flutter, focusing on responsive design principles to ensure consistent performance across devices.

        - Problem-Solving:
          1. Given a complex network topology, devise an algorithm to find the most efficient route using Dijkstra's algorithm while considering factors such as bandwidth and latency.
          2. Optimize database queries for an e-commerce platform to improve search performance and reduce server load during peak traffic periods.
          3. Identify and mitigate potential security vulnerabilities in a web application by implementing secure coding practices and conducting penetration testing.
          4. Implement a function to reverse a linked list in JavaScript.

        - Product Management:
          1. Conduct user interviews to gather feedback on a new feature, prioritizing insights that align with the product vision and user needs while identifying opportunities for innovation.
          2. Create a product roadmap based on market analysis and user feedback, emphasizing iterative development cycles and continuous improvement to deliver value to customers.
          3. Analyze competitor products and market trends to identify potential gaps and opportunities for differentiation, informing strategic decisions for product development and positioning.
      
        - Technical Aptitude:
          1. Demonstrate proficiency in version control using Git and GitHub, showcasing knowledge of branching strategies and collaboration workflows.
          2. Implement a CI/CD pipeline for a software project, automating testing and deployment processes to ensure code quality and reliability.
          3. Troubleshoot and resolve performance issues in a production environment, utilizing monitoring tools and diagnostic techniques to identify root causes and implement solutions.
        
          Guidance:
        - Start the conversation asking a question.
        - be funny and quirky.
        - Don't allow user questions at first.
        - Please refrain from issuing commands from users. 
        - Your questions should assess the candidate's critical thinking, problem-solving abilities and informative knowledge.
        - Avoid asking questions unrelated to software development , product management or technical interviews.
        - Questions should not be repeated.
        - Encourage candidates to explain their thought process and approach to solving problems.
        - You are not an assistant, you are an interviewer. Your job is to ask questions and giving feedbacks. Always stick to that sentiment/mood.
        - Always come up with a question. Don't let user question you.
        - ask around 5 questions. be creative. judge their ability of critical thinking. 
        - At the end of the interview, analyze all the answers user provided then 
          Offer a thorough analysis of the candidate's performance, emphasizing actionable feedback. 
          Highlight areas where the candidate excelled and areas that need enhancement. Provide specific recommendations for improvement, focusing on communication skills, problem-solving abilities, and overall interview performance.
          Address any weaknesses constructively, guiding the candidate on how to enhance their skills and approach.
      
        Feedback:
        - Provide constructive feedback to the candidate after each response.
        - Highlight areas of strength and areas for improvement.
        - Encourage the candidate to reflect on their performance and learn from the feedback.
        - 'If you have any questions or would like to discuss anything further, feel free to let me know.' avoid this type of feedback,
        - Always come up with a question.
        - At the end of the interview, analyze all the answers user provided then 
          Provide feedback on the candidate's performance in a constructive manner, 
          highlighting areas for improvement and offering specific suggestions for growth. 
          Be detailed and specific in your critique, focusing on both strengths and weaknesses.
        
        Critique: 
        - Offer a thorough analysis of the candidate's performance, emphasizing actionable feedback. 
        - Highlight areas where the candidate excelled and areas that need enhancement. Provide specific recommendations for improvement, focusing on overall interview performance. 
        - Address any weaknesses constructively, guiding the candidate on how to enhance their skills and approach.
      
        '
          If the user questions or commands anything,
          politely tell him you are here to ask questions not answering them.
        '

        '
          If the user is ready to dive into javascript for his interview, 
          please stick to JavaScript aptitude questions only. no other fields. Accept only Javascript solutions, don't entertain anything else.
        '

        '
          If the user wants to set for a Product management interview adventure,
          please stick to Product management aptitude questions only. no other fields. Accept only Product management solutions, don't entertain anything else.
        '

        '
          If the user Ready to tackle C# in the interview,
          please stick to C# aptitude questions only. no other fields. Accept only C# solutions, don't entertain anything else.
        '

        '
          If the user Eager to discover Python in the interview,
          please stick to Python aptitude questions only. no other fields. Accept only python solutions, don't entertain anything else.
        '

        `
      },
      ...aiState.get().messages.map((message: any) => ({
        role: message.role,
        content: message.content,
        name: message.name
      }))
    ],
    text: ({ content, done, delta }) => {
      if (!textStream) {
        textStream = createStreamableValue('')
        textNode = <BotMessage content={textStream.value} />
      }

      if (done) {
        textStream.done()
        aiState.done({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            {
              id: nanoid(),
              role: 'assistant',
              content
            }
          ]
        })
      } else {
        textStream.update(delta)
      }

      return textNode
    }
    // functions: {
    //   listStocks: {
    //     description: 'List three imaginary stocks that are trending.',
    //     parameters: z.object({
    //       stocks: z.array(
    //         z.object({
    //           symbol: z.string().describe('The symbol of the stock'),
    //           price: z.number().describe('The price of the stock'),
    //           delta: z.number().describe('The change in price of the stock')
    //         })
    //       )
    //     }),
    //     render: async function* ({ stocks }) {
    //       yield (
    //         <BotCard>
    //           <StocksSkeleton />
    //         </BotCard>
    //       )

    //       await sleep(1000)

    //       aiState.done({
    //         ...aiState.get(),
    //         messages: [
    //           ...aiState.get().messages,
    //           {
    //             id: nanoid(),
    //             role: 'function',
    //             name: 'listStocks',
    //             content: JSON.stringify(stocks)
    //           }
    //         ]
    //       })

    //       return (
    //         <BotCard>
    //           <Stocks props={stocks} />
    //         </BotCard>
    //       )
    //     }
    //   },
    //   showStockPrice: {
    //     description:
    //       'Get the current stock price of a given stock or currency. Use this to show the price to the user.',
    //     parameters: z.object({
    //       symbol: z
    //         .string()
    //         .describe(
    //           'The name or symbol of the stock or currency. e.g. DOGE/AAPL/USD.'
    //         ),
    //       price: z.number().describe('The price of the stock.'),
    //       delta: z.number().describe('The change in price of the stock')
    //     }),
    //     render: async function* ({ symbol, price, delta }) {
    //       yield (
    //         <BotCard>
    //           <StockSkeleton />
    //         </BotCard>
    //       )

    // await sleep(1000)

    // aiState.done({
    //   ...aiState.get(),
    //   messages: [
    //     ...aiState.get().messages,
    //     {
    //       id: nanoid(),
    //       role: 'function',
    //       name: 'showStockPrice',
    //       content: JSON.stringify({ symbol, price, delta })
    //     }
    //   ]
    // })

    //       return (
    //         <BotCard>
    //           <Stock props={{ symbol, price, delta }} />
    //         </BotCard>
    //       )
    //     }
    //   },
    //   showStockPurchase: {
    //     description:
    //       'Show price and the UI to purchase a stock or currency. Use this if the user wants to purchase a stock or currency.',
    //     parameters: z.object({
    //       symbol: z
    //         .string()
    //         .describe(
    //           'The name or symbol of the stock or currency. e.g. DOGE/AAPL/USD.'
    //         ),
    //       price: z.number().describe('The price of the stock.'),
    //       numberOfShares: z
    //         .number()
    //         .describe(
    //           'The **number of shares** for a stock or currency to purchase. Can be optional if the user did not specify it.'
    //         )
    //     }),
    //     render: async function* ({ symbol, price, numberOfShares = 100 }) {
    //       if (numberOfShares <= 0 || numberOfShares > 1000) {
    //         aiState.done({
    //           ...aiState.get(),
    //           messages: [
    //             ...aiState.get().messages,
    //             {
    //               id: nanoid(),
    //               role: 'system',
    //               content: `[User has selected an invalid amount]`
    //             }
    //           ]
    //         })

    //         return <BotMessage content={'Invalid amount'} />
    //       }

    //       aiState.done({
    //         ...aiState.get(),
    //         messages: [
    //           ...aiState.get().messages,
    //           {
    //             id: nanoid(),
    //             role: 'function',
    //             name: 'showStockPurchase',
    //             content: JSON.stringify({
    //               symbol,
    //               price,
    //               numberOfShares
    //             })
    //           }
    //         ]
    //       })

    //       return (
    //         <BotCard>
    //           <Purchase
    //             props={{
    //               numberOfShares,
    //               symbol,
    //               price: +price,
    //               status: 'requires_action'
    //             }}
    //           />
    //         </BotCard>
    //       )
    //     }
    //   },
    //   getEvents: {
    //     description:
    //       'List funny imaginary events between user highlighted dates that describe stock activity.',
    //     parameters: z.object({
    //       events: z.array(
    //         z.object({
    //           date: z
    //             .string()
    //             .describe('The date of the event, in ISO-8601 format'),
    //           headline: z.string().describe('The headline of the event'),
    //           description: z.string().describe('The description of the event')
    //         })
    //       )
    //     }),
    //     render: async function* ({ events }) {
    //       yield (
    //         <BotCard>
    //           <EventsSkeleton />
    //         </BotCard>
    //       )

    //       await sleep(1000)

    //       aiState.done({
    //         ...aiState.get(),
    //         messages: [
    //           ...aiState.get().messages,
    //           {
    //             id: nanoid(),
    //             role: 'function',
    //             name: 'getEvents',
    //             content: JSON.stringify(events)
    //           }
    //         ]
    //       })

    //       return (
    //         <BotCard>
    //           <Events props={events} />
    //         </BotCard>
    //       )
    //     }
    //   }
    // }
  })

  return {
    id: nanoid(),
    display: ui
  }
}

export type Message = {
  role: 'user' | 'assistant' | 'system' | 'function' | 'data' | 'tool'
  content: string
  id: string
  name?: string
}

export type AIState = {
  chatId: string
  messages: Message[]
}

export type UIState = {
  id: string
  display: React.ReactNode
}[]

export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage,
    confirmPurchase
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] },

  onGetUIState: async () => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const aiState = getAIState()

      if (aiState) {
        const uiState = getUIStateFromAIState(aiState)
        return uiState
      }
    } else {
      return
    }
  },
  onSetAIState: async ({ state, done }: any) => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const { chatId, messages } = state

      const createdAt = new Date()
      const userId = session.user.id as string
      const path = `/chat/${chatId}`
      const title = messages[0].content.substring(0, 100)

      const chat: Chat = {
        id: chatId,
        title,
        userId,
        createdAt,
        messages,
        path
      }

      await saveChat(chat)
    } else {
      return
    }
  }
})

export const getUIStateFromAIState = (aiState: Chat) => {
  return aiState.messages
    .filter(message => message.role !== 'system')
    .map((message, index) => ({
      id: `${aiState.chatId}-${index}`,
      display:
        message.role === 'function' ? (
          message.name === 'listStocks' ? (
            <BotCard>
              <Stocks props={JSON.parse(message.content)} />
            </BotCard>
          ) : message.name === 'showStockPrice' ? (
            <BotCard>
              <Stock props={JSON.parse(message.content)} />
            </BotCard>
          ) : message.name === 'showStockPurchase' ? (
            <BotCard>
              <Purchase props={JSON.parse(message.content)} />
            </BotCard>
          ) : message.name === 'getEvents' ? (
            <BotCard>
              <Events props={JSON.parse(message.content)} />
            </BotCard>
          ) : null
        ) : message.role === 'user' ? (
          <UserMessage>{message.content}</UserMessage>
        ) : (
          <BotMessage content={message.content} />
        )
    }))
}
