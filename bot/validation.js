export function validate(body, rules) {
  try {
    for (const [field, rule] of Object.entries(rules)) {
      const value = body[field]
      if (rule.required && (value === undefined || value === null || value === '')) {
        throw new Error(`${field} is required`)
      }
      if (value !== undefined && value !== null && value !== '') {
        if (rule.type === 'uuid' && typeof value === 'string' && !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value)) {
          throw new Error(`${field} must be a valid UUID`)
        }
        if (rule.type === 'number' && typeof value !== 'number' && isNaN(Number(value))) {
          throw new Error(`${field} must be a number`)
        }
        if (rule.type === 'string' && typeof value !== 'string') {
          throw new Error(`${field} must be a string`)
        }
        if (rule.type === 'array' && !Array.isArray(value)) {
          throw new Error(`${field} must be an array`)
        }
        if (rule.type === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
          throw new Error(`${field} must be an object`)
        }
        if (rule.enum && !rule.enum.includes(value)) {
          throw new Error(`${field} must be one of: ${rule.enum.join(', ')}`)
        }
      }
    }
  } catch (error) {
    console.error('Validation failed for body:', body, 'Error:', error.message)
    throw error
  }
}
