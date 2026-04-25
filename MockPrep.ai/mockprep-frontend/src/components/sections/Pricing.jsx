import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Link } from 'react-router-dom'

const plans = [
  { name: 'Free', price: '₹0', period: 'forever', desc: 'Perfect to get started', features: ['3 mock interviews/month', 'Basic AI feedback', 'Technical domain only', 'Email support'], cta: 'Start Free', highlight: false },
  { name: 'Pro', price: '₹299', period: '/month', desc: 'For serious job seekers', features: ['Unlimited interviews', 'Full AI report & scoring', 'All 3 domains', 'Resume intelligence', 'Priority support'], cta: 'Upgrade Now →', highlight: true },
  { name: 'Premium', price: '₹599', period: '/month', desc: 'For placement-ready students', features: ['Everything in Pro', 'Custom role targeting', 'Interview recordings', 'Performance analytics', 'Success manager'], cta: 'Go Premium', highlight: false },
]

export default function Pricing() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="pricing" className="bg-bg-light py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16">
          <p className="font-body text-primary text-sm font-semibold tracking-wide uppercase mb-3">Pricing</p>
          <h2 className="font-heading font-bold text-4xl md:text-5xl text-text-dark mb-4">
            Simple, <span className="text-primary">Transparent</span> Pricing
          </h2>
          <p className="font-body text-text-mid text-lg">Start free. No credit card required.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              whileHover={{ y: plan.highlight ? -4 : -6 }}
              className={`relative rounded-2xl p-6 flex flex-col gap-5 transition-colors duration-300 ${
                plan.highlight
                  ? 'bg-gradient-to-b from-[#5358F3] via-[#883BE8] to-[#9F3BDF] text-white shadow-2xl shadow-primary/30 scale-105'
                  : 'bg-white border border-border-light hover:border-primary/20 hover:shadow-lg'
              }`}>
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <motion.span
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="bg-white text-primary text-xs font-body font-bold px-3 py-1 rounded-full shadow">
                    Most Popular
                  </motion.span>
                </div>
              )}

              <div>
                <p className={`font-heading font-semibold mb-1 ${plan.highlight ? 'text-white/80' : 'text-text-mid'}`}>{plan.name}</p>
                <div className="flex items-baseline gap-1">
                  <span className={`font-heading font-bold text-4xl ${plan.highlight ? 'text-white' : 'text-text-dark'}`}>{plan.price}</span>
                  <span className={`font-body text-sm ${plan.highlight ? 'text-white/60' : 'text-text-light'}`}>{plan.period}</span>
                </div>
                <p className={`font-body text-sm mt-1 ${plan.highlight ? 'text-white/70' : 'text-text-light'}`}>{plan.desc}</p>
              </div>

              <ul className="flex flex-col gap-2.5 flex-1">
                {plan.features.map((f, j) => (
                  <motion.li
                    key={j}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + j * 0.07 }}
                    className="flex items-center gap-2.5">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                      <path d="M5 13l4 4L19 7" stroke={plan.highlight ? 'white' : '#5358F3'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className={`font-body text-sm ${plan.highlight ? 'text-white/85' : 'text-text-mid'}`}>{f}</span>
                  </motion.li>
                ))}
              </ul>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link to="/signup"
                  className={`block w-full py-3 rounded-xl font-body font-semibold text-sm text-center transition-all duration-200 ${
                    plan.highlight
                      ? 'bg-white text-primary hover:bg-primary-50'
                      : 'bg-gradient-to-b from-[#5358F3] via-[#883BE8] to-[#9F3BDF] text-white hover:shadow-lg hover:shadow-primary/25'
                  }`}>
                  {plan.cta}
                </Link>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}