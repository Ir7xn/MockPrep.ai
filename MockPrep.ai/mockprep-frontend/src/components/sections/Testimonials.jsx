import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const testimonials = [
  { name: 'Priya Sharma', role: 'SDE-2 at Flipkart', text: 'MockPrep.ai helped me crack my FAANG interview. The adaptive AI questions were way harder than what I expected in the real thing — and that was exactly what I needed.', stars: 5, avatar: 'P' },
  { name: 'Rahul Mehta', role: 'Product Manager at Zepto', text: 'The HR round practice was incredibly realistic. I went into my actual interview calm and confident because I had already answered similar questions 10 times with AI feedback.', stars: 5, avatar: 'R' },
  { name: 'Ananya Iyer', role: 'Data Analyst at Swiggy', text: 'I loved how instant the feedback was. After every session I knew exactly what to improve. Traditional mock interviews never gave me this level of detail.', stars: 5, avatar: 'A' },
]

export default function Testimonials() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="testimonials" className="bg-white py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16">
          <p className="font-body text-primary text-sm font-semibold tracking-wide uppercase mb-3">Testimonials</p>
          <h2 className="font-heading font-bold text-4xl md:text-5xl text-text-dark mb-4">
            Loved by <span className="text-primary">Students</span> Everywhere
          </h2>
          <p className="font-body text-text-mid text-lg">Real results from real candidates.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              whileHover={{ y: -6 }}
              className="bg-white border border-border-light rounded-2xl p-6 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-colors duration-300">
              <div className="text-3xl text-primary/20 font-heading font-bold mb-3">"</div>
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.stars }).map((_, j) => (
                  <motion.svg
                    key={j}
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + j * 0.06 }}
                    width="16" height="16" viewBox="0 0 24 24" fill="#5358F3">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </motion.svg>
                ))}
              </div>
              <p className="font-body text-text-mid text-sm leading-relaxed mb-6">{t.text}</p>
              <div className="flex items-center gap-3 pt-4 border-t border-border-light">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#5358F3] to-[#9F3BDF] flex items-center justify-center font-heading font-bold text-white text-sm">
                  {t.avatar}
                </div>
                <div>
                  <p className="font-body font-semibold text-text-dark text-sm">{t.name}</p>
                  <p className="font-body text-text-light text-xs">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}