import * as ampq from 'amqplib';

export type NeMessageQBase<T> = {
  payload: T
};

type NeMsgHeader =   {
  retryCount?: number;
  error?: string;
}


export class NeMessageQ<T> {
  private config = {
    server: process.env.RABBIT_CONNECTION || 'amqp://localhost',
    exchange: process.env.RABBIT_EXCHANGE || 'neAdmin',
    username: process.env.RABBIT_USERNAME || 'admin',
    password: process.env.RABBIT_PASSWORD || 'admin',
  };

  constructor(
    private routing: {
      key: string;
      qName?: string;
    }
  ) {}

  private channel: ampq.Channel | undefined;

  async init() {
    if (this.channel) {
      //console.debug('NeMessageQ:init Channel already initialized');
      return this.channel;
    }

    const credentials = ampq.credentials.plain(
      this.config.username,
      this.config.password
    );

    const connection = await ampq.connect(this.config.server, { credentials });

    this.channel = await connection.createChannel();

    const dlx = 'dlx-' + this.config.exchange;

    await this.channel.assertExchange(this.config.exchange, 'direct', {
      durable: true,
    });
    await this.channel.assertExchange(dlx, 'direct', { durable: true });

    console.log(
      'NeMessageQ:init exchange asserted ',
      JSON.stringify(this.config)
    );

    if (this.routing.qName) {
      const dlq = 'dlq-' + this.routing.qName;

      this.channel.assertQueue(this.routing.qName, {
        durable: true,
        deadLetterExchange: dlx,
        deadLetterRoutingKey: this.routing.key,
      });

      this.channel.assertQueue(dlq, {
        durable: true,
      });

      this.channel.bindQueue(
        this.routing.qName,
        this.config.exchange,
        this.routing.key
      );

      this.channel.bindQueue(dlq, dlx, this.routing.key);

      console.log(
        'NeMessageQ:init queue asserted ',
        JSON.stringify(this.routing)
      );

      this.channel.prefetch(1);
    }

    return this.channel;
  }

  async publish(payload: T) {

    const data : NeMessageQBase<T> = {
      payload
    };

    if (
      !(await this.init()).publish(
        this.config.exchange,
        this.routing.key,
        Buffer.from(JSON.stringify(data)),
        {
          persistent: true,
        }
      )
    ) {
      throw new Error('failed to publish');
    }
  }

  async consume(callBack: (payload: T) => Promise<void>) {
    if (!this.routing.qName) {
      throw new Error('Not initialized with qName');
    }

    (await this.init()).consume(this.routing.qName, async (msg) => {
      let msgObject: NeMessageQBase<T>;
      try {
        msgObject = JSON.parse(msg.content.toString()) as NeMessageQBase<T>;
      } catch (error) {
        console.error('NeMessageQ:consume json failed ', error);
        this.channel.nack(msg, false);
      }

      const neHeader = msg.properties.headers as NeMsgHeader;

      const retryCount: number =   neHeader.retryCount || 0;

      try {
        if (retryCount > 3) {
          console.warn('NeMessageQ:consume > 3');

          this.channel.nack(msg, false,false);
          return;
        }

        await callBack(msgObject.payload);


      } catch (error) {
        console.warn(`NeMessageQ:consume failed : ${msg.fields.deliveryTag}`, error);
        
        const toPublish: NeMessageQBase<T> = {
          ...msgObject,
        };

        const newHeaders : NeMsgHeader = {
          retryCount: retryCount + 1,
          error: error.toString(),
        };

        try {
          this.channel.sendToQueue(this.routing.qName, Buffer.from(JSON.stringify(toPublish)),{
            persistent:true,
            headers:newHeaders
          });
        } catch (pubError) {
          console.error('Failed to republish ', pubError);
        }
          
      }

      this.channel.ack(msg, false);
    },{
        noAck: false,
    });
  }
}
