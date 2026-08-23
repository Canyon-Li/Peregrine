
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import ChatEmptyState, { EXAMPLE_PROMPTS } from './ChatEmptyState'

describe('ChatEmptyState', () => {
    const html = renderToStaticMarkup(<ChatEmptyState onSelectPrompt={() => {}} />)
    expect(html).toContain('What should Peregrine work on?')
    for (const prompt of EXAMPLE_PROMPTS) expect(html).toContain(prompt)
  })
})
