import express from "express"
import cors from "cors"
import morgan from "morgan"
import { configDotenv } from "dotenv";
import Stripe from "stripe";
import { v4 as uuidv4 } from 'uuid';
import bodyParser from "body-parser";

const app = express();
app.use(express.json());
app.use(morgan('dev'));
app.use(cors(
    {
        origin: '*',
        methods: ['GET', 'POST']
    }
));
configDotenv();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.get('/', (req, res) => {
    res.status(200).json({
        status: 'success'
    })
})

app.post('/Payment/Processing', async (req, res) => {
    const { services } = req.body;
    const idempotencyKey = uuidv4();

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'gbp',
                    product_data: {
                        name: 'KZ CARS MCR LTD',
                        description: `Book Luxury Car Serivice from ${services.startingLocation} to ${services.endingLocation}`,
                        images: ['https://imgd.aeplcdn.com/642x336/n/cw/ec/140591/x1-exterior-right-front-three-quarter-7.jpeg?isig=0&q=80'],
                    },
                    unit_amount: services.price * 100,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: 'https://www.google.com',
            cancel_url: 'https://your-cancel-url.com',
            customer_email: services.email,
        }, { idempotencyKey });

        res.status(200).json({
            status: 'success',
            checkout_session_url: session.url,
        });
    } catch (err) {
        console.error(err);
        res.status(400).json({
            status: 'error',
            err: err.message,
        });
    }
})

app.post('/webhook', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error(err);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        alert("Payment Completed");
        console.log(`Payment completed for session: ${session.id}`);
    }

    res.status(200).end();
});

app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
})