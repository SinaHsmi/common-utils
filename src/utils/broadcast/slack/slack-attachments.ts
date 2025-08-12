/* eslint-disable import/prefer-default-export */
import { PRIORITY, Attachment } from './index'

const PRIORITY_TEXT = ['Not Important', 'Normal', 'Warning', 'High', 'Very High']

function generateAttachment({
  title,
  message,
  color,
  priority = PRIORITY.NORMAL,
}: {
  title: string
  message?: string
  color?: string
  priority?: number
}) {
  const fields = []
  if (message) {
    fields.push({
      title: 'Details',
      value: message,
      short: false,
    })
  }
  return {
    title,
    text: `***Priority*** : *${PRIORITY_TEXT[priority]}*`,
    color: color || '#B3B6B5',
    fields,
  } as Attachment
}

export { generateAttachment }
