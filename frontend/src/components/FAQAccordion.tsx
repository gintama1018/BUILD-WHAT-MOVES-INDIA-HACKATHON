import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    question: 'Why does RTI jurisdiction matter so much?',
    answer: 'Under India’s constitutional structure (Seventh Schedule), government powers are distributed between the Union (Central), State, and Local bodies. Filing an application on the Central portal (rtionline.gov.in) for a State subject (like municipal roads or state electricity) will lead to your application being returned without a refund. Identifying the correct authority beforehand avoids weeks of wasted time.'
  },
  {
    question: 'Does the RTI Act Section 6(3) automatically transfer wrong applications?',
    answer: 'Section 6(3) requires a public authority to transfer an application if the subject matter belongs to another authority. However, DoPT circulars treat Central-to-State and State-to-Central transfers as optional rather than mandatory. In practice, cross-jurisdiction transfers are rare and often result in rejection. Getting jurisdiction right before filing is essential.'
  },
  {
    question: 'How much is the RTI application fee in India?',
    answer: 'For Central Government authorities (rtionline.gov.in) and state portals like Maharashtra (rtionline.maharashtra.gov.in) and Delhi (rtionline.delhi.gov.in), the standard fee is ₹10. Under the Section 7(5) proviso of the Right to Information Act, 2005, citizens living Below the Poverty Line (BPL) are completely exempt from all application and document copying fees upon providing proof of BPL status (e.g. BPL ration card or certificate).'
  },
  {
    question: 'What happens if a subject is on the Concurrent List (like Education)?',
    answer: 'Under Entry 25 of the Concurrent List, both the Central Ministry of Education and State Education Departments hold different records. Central MoE holds national policies and centrally-funded schemes (like PM POSHAN or UGC), while State departments manage local government schools and state curricula. Nyaya surfaces both authorities honestly and explains the distinction.'
  },
  {
    question: 'Does Nyaya file the RTI on my behalf?',
    answer: 'No. Nyaya is a guidance assistant that tells you the exact authority, designated officer (PIO), application fee, and official portal URL. You file directly on the verified government portal (e.g. rtionline.gov.in or rtionline.maharashtra.gov.in).'
  },
  {
    question: 'How does Nyaya ensure it never recommends fake authorities?',
    answer: 'Nyaya uses a deterministic Rule Engine that acts as a hard filter. The AI only parses your plain-language query into topics and locations; only verified rows from our curated Knowledge Base of official government bodies are ever surfaced.'
  }
];

export function FAQAccordion() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const toggle = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <div className="accordion-list">
      {FAQ_DATA.map((item, idx) => {
        const isOpen = openIdx === idx;
        return (
          <div key={idx} className="accordion-item">
            <button
              className="accordion-trigger"
              onClick={() => toggle(idx)}
              aria-expanded={isOpen}
              aria-controls={`faq-answer-${idx}`}
            >
              <span>{item.question}</span>
              <span style={{ fontSize: '1.25rem', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
                ▾
              </span>
            </button>
            {isOpen && (
              <div id={`faq-answer-${idx}`} className="accordion-content">
                <p>{item.answer}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
