import * as ampq from 'amqplib';

export type NeMessageQBase = {
  retryCount?: number;
  error?: string;
};

export class NeMessageQ<T extends NeMessageQBase> {
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

  private async init() {
    if (this.channel) {
      console.debug('NeMessageQ:init Channel already initialized');
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

  async publish(data: T) {
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

  async consume(callBack: (msg: T) => void) {
    if (!this.routing.qName) {
      throw new Error('Not initialized with qName');
    }

    (await this.init()).consume(this.routing.qName, (msg) => {
      let msgObject: T;
      try {
        msgObject = JSON.parse(msg.content.toString()) as T;
      } catch (error) {
        console.error('NeMessageQ:consume json failed ', error);
        this.channel.nack(msg, false);
      }

      const retryCount: number = msgObject.retryCount || 0;

      try {
        if (retryCount > 3) {
          console.warn('NeMessageQ:consume > 3');

          this.channel.nack(msg, false,false);
          return;
        }

        callBack(msgObject);


      } catch (error) {
        console.warn(`NeMessageQ:consume failed : ${msg.fields.deliveryTag}`, error);
        
        const toPublish: T = {
          ...msgObject,
          retryCount: retryCount + 1,
          error: error.toString(),
        };

        try {
          this.channel.sendToQueue(this.routing.qName, Buffer.from(JSON.stringify(toPublish)),{
            persistent:true
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
