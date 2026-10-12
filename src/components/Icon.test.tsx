import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Icon } from './Icon'

describe('settings icon', () => {
  it('renders a centered gear in the shared 24 by 24 icon frame', () => {
    const markup = renderToStaticMarkup(createElement(Icon, { name: 'settings', size: 20 }))
    expect(markup).toContain('viewBox="0 0 24 24"')
    expect(markup).toContain('stroke-width="1.8"')
    expect(markup).toContain('cx="12" cy="12" r="3"')
    expect(markup).toContain('M12.22 2h-.44')
  })
})
