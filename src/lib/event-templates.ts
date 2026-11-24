export interface EventTemplate {
  type: string;
  label: string;
  description: string;
  payload: Record<string, any>;
}

export const EVENT_TEMPLATES: Record<string, EventTemplate> = {
  'payment.captured': {
    type: 'payment.captured',
    label: 'Payment Captured',
    description: 'Triggered when a customer card payment settles successfully',
    payload: {
      paymentId: 'pay_live_891238472',
      amount: 4999, // $49.99 in cents
      currency: 'usd',
      status: 'succeeded',
      customer: {
        id: 'cus_993812',
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
      },
      paymentMethod: {
        type: 'card',
        brand: 'visa',
        last4: '4242',
      },
      receiptUrl: 'https://pay.example.com/receipts/rcpt_891238472',
    },
  },
  'invoice.created': {
    type: 'invoice.created',
    label: 'Invoice Created',
    description: 'Triggered when a recurring billing invoice is finalized',
    payload: {
      invoiceId: 'inv_2026_08912',
      number: 'INV-00492',
      amountDue: 12000, // $120.00
      currency: 'usd',
      customer: {
        id: 'cus_884120',
        name: 'Acme Technologies Inc.',
        email: 'billing@acme.example.com',
      },
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
      items: [
        { description: 'Enterprise Platform Plan (Monthly)', amount: 12000, quantity: 1 },
      ],
    },
  },
  'subscription.renewed': {
    type: 'subscription.renewed',
    label: 'Subscription Renewed',
    description: 'Triggered when an active SaaS subscription renews',
    payload: {
      subscriptionId: 'sub_live_3812903',
      planId: 'enterprise_annual',
      customer: {
        id: 'cus_772109',
        name: 'Alex Rivera',
        email: 'alex@startup.example.com',
      },
      periodStart: new Date().toISOString(),
      periodEnd: new Date(Date.now() + 365 * 86400000).toISOString(),
      status: 'active',
      seats: 25,
    },
  },
  'customer.created': {
    type: 'customer.created',
    label: 'Customer Created',
    description: 'Triggered when a new user registers an account',
    payload: {
      customerId: 'cus_new_192837',
      name: 'Samantha Vance',
      email: 'samantha@cloud.example.com',
      organization: 'Vance Dynamics Ltd',
      tier: 'standard',
      createdAt: new Date().toISOString(),
    },
  },
  'order.fulfilled': {
    type: 'order.fulfilled',
    label: 'Order Fulfilled',
    description: 'Triggered when physical goods are dispatched with tracking',
    payload: {
      orderId: 'ord_91823749',
      carrier: 'FedEx Express',
      trackingNumber: '794612345678',
      shippingAddress: {
        line1: '100 Market Street, Suite 400',
        city: 'San Francisco',
        state: 'CA',
        country: 'US',
        postalCode: '94105',
      },
      itemsCount: 3,
      fulfilledAt: new Date().toISOString(),
    },
  },
};

export const DEFAULT_EVENT_TYPE = 'payment.captured';
