
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import ChatEmptyState, { EXAMPLE_PROMPTS } from './ChatEmptyState'

describe('ChatEmptyState', () => {
    const html = renderToStaticMarkup(<ChatEmptyState onSelectPrompt={() => {}} />)
    expect(html).toContain('今天想让 Peregrine 帮你完成什么？')
    for (const prompt of EXAMPLE_PROMPTS) expect(html).toContain(prompt)
  })
})
