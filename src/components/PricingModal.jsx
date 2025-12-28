import { useState } from 'react';
import * as api from '../lib/api';

const PLANS = [
  {
    id: 'pro_individual',
    name: 'Pro Individual',
    description: 'For personal use',
    features: [
      'Unlimited messages',
      'Access to all AI models',
      'Image & file uploads',
      'Conversation sharing',
      'Export conversations',
      'Custom system prompts',
      'API key management',
      'Usage analytics',
    ],
    monthly: 19,
    yearly: 190,
  },
  {
    id: 'pro_team',
    name: 'Pro Team',
    description: 'For small teams',
    features: [
      'Everything in Pro Individual',
      'Team workspaces',
      'Shared conversations',
      'Team member management',
      'Up to 10 team members',
    ],
    monthly: 29,
    yearly: 290,
    popular: true,
  },
  {
    id: 'pro_organization',
    name: 'Pro Organization',
    description: 'For large organizations',
    features: [
      'Everything in Pro Team',
      'Unlimited team members',
      'Organization analytics',
      'Billing management',
      'Priority support',
      'Custom integrations',
    ],
    monthly: 49,
    yearly: 490,
  },
];

export default function PricingModal({ isOpen, onClose, user }) {
  const [interval, setInterval] = useState('monthly');
  const [loading, setLoading] = useState(null);

  if (!isOpen) return null;

  const handleSubscribe = async (planId) => {
    setLoading(planId);
    try {
      const response = await api.createCheckoutSession(planId, interval);
      if (response.url) {
        window.location.href = response.url;
      } else if (response.error) {
        console.error('Checkout error:', response);
        alert(`Failed to start checkout: ${response.details || response.error}`);
      }
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleManageBilling = async () => {
    setLoading('portal');
    try {
      const { url } = await api.createPortalSession();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Failed to create portal session:', error);
      alert('Failed to open billing portal. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const isCurrentPlan = (planId) => {
    if (!user) return false;
    const scope = user.subscription_scope || 'individual';
    const tier = user.subscription_tier || 'free';
    if (tier !== 'pro') return false;
    return planId === `pro_${scope}`;
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gpt-main rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gpt-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gpt-text">Upgrade to Pro</h2>
              <p className="text-gpt-muted mt-1">Choose the plan that works best for you</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gpt-muted hover:text-gpt-text rounded-lg transition-colors"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex items-center justify-center gap-4 mt-6">
            <span
              className={`text-sm ${interval === 'monthly' ? 'text-gpt-text' : 'text-gpt-muted'}`}
            >
              Monthly
            </span>
            <button
              onClick={() => setInterval(interval === 'monthly' ? 'yearly' : 'monthly')}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                interval === 'yearly' ? 'bg-green-600' : 'bg-gpt-border'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                  interval === 'yearly' ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
            <span
              className={`text-sm ${interval === 'yearly' ? 'text-gpt-text' : 'text-gpt-muted'}`}
            >
              Yearly
              <span className="ml-1 text-green-500 text-xs font-medium">Save 17%</span>
            </span>
          </div>
        </div>

        <div className="p-6">
          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-xl border p-6 flex flex-col ${
                  plan.popular
                    ? 'border-green-500 bg-green-500/5'
                    : 'border-gpt-border bg-gpt-sidebar'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
                    Most Popular
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gpt-text">{plan.name}</h3>
                  <p className="text-gpt-muted text-sm mt-1">{plan.description}</p>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gpt-text">
                      ${interval === 'monthly' ? plan.monthly : plan.yearly}
                    </span>
                    <span className="text-gpt-muted">/{interval === 'monthly' ? 'mo' : 'yr'}</span>
                  </div>
                  {interval === 'yearly' && (
                    <p className="text-green-500 text-sm mt-1">
                      ${Math.round(plan.monthly * 12 - plan.yearly)} saved per year
                    </p>
                  )}
                </div>

                <ul className="space-y-3 mb-6 flex-1">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gpt-text">
                      <svg
                        className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                {isCurrentPlan(plan.id) ? (
                  <button
                    onClick={handleManageBilling}
                    disabled={loading === 'portal'}
                    className="w-full py-3 px-4 rounded-lg bg-gpt-border text-gpt-text font-medium hover:bg-gpt-hover transition-colors disabled:opacity-50"
                  >
                    {loading === 'portal' ? 'Loading...' : 'Manage Subscription'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={loading === plan.id}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                      plan.popular
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gpt-border text-gpt-text hover:bg-gpt-hover'
                    }`}
                  >
                    {loading === plan.id ? 'Loading...' : 'Subscribe'}
                  </button>
                )}
              </div>
            ))}
          </div>

          {user?.subscription_tier === 'pro' && (
            <div className="mt-6 text-center">
              <button
                onClick={handleManageBilling}
                disabled={loading === 'portal'}
                className="text-gpt-muted hover:text-gpt-text text-sm underline"
              >
                {loading === 'portal' ? 'Loading...' : 'Manage billing & cancel subscription'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
