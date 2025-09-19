// Smart event analyzer - extracts only critical activities
export interface CriticalEvent {
  id: string;
  type: 'form_interaction' | 'navigation' | 'authentication' | 'file_upload' | 'button_action';
  action: string;
  element: {
    tag: string;
    selector: string;
    text?: string;
    value?: string;
    placeholder?: string;
  };
  context: {
    page: string;
    form?: string;
    step?: string;
  };
  timestamp: number;
  importance: 'high' | 'medium' | 'low';
}

export function analyzeEvent(rawEvent: any): CriticalEvent | null {
  const { type, element, value, url, timestamp } = rawEvent;
  
  // Skip noise events
  if (isNoiseEvent(rawEvent)) {
    return null;
  }
  
  // Analyze critical activities
  if (isFormInteraction(rawEvent)) {
    return {
      id: generateId(),
      type: 'form_interaction',
      action: getFormAction(rawEvent),
      element: {
        tag: element.tag,
        selector: element.selector,
        text: element.text,
        value: value,
        placeholder: element.placeholder
      },
      context: {
        page: url,
        form: detectFormContext(element.selector),
        step: detectFormStep(url, element.selector)
      },
      timestamp,
      importance: getFormImportance(element, value)
    };
  }
  
  if (isNavigation(rawEvent)) {
    return {
      id: generateId(),
      type: 'navigation',
      action: 'page_change',
      element: {
        tag: element.tag,
        selector: element.selector,
        text: element.text
      },
      context: {
        page: url
      },
      timestamp,
      importance: 'high'
    };
  }
  
  if (isButtonAction(rawEvent)) {
    return {
      id: generateId(),
      type: 'button_action',
      action: getButtonAction(element.text, element.selector),
      element: {
        tag: element.tag,
        selector: element.selector,
        text: element.text
      },
      context: {
        page: url,
        form: detectFormContext(element.selector)
      },
      timestamp,
      importance: getButtonImportance(element.text, element.selector)
    };
  }
  
  return null;
}

function isNoiseEvent(event: any): boolean {
  const { type, element } = event;
  
  // Skip scroll events
  if (type === 'scroll') return true;
  
  // Skip random clicks on empty space
  if (type === 'click' && (!element || !element.text && !element.placeholder)) return true;
  
  // Skip keystrokes that don't change values
  if (type === 'key' && !isFormElement(element)) return true;
  
  // Skip hover events
  if (type === 'hover') return true;
  
  return false;
}

function isFormInteraction(event: any): boolean {
  const { type, element } = event;
  
  if (type !== 'input' && type !== 'click') return false;
  
  // Form input fields
  if (isFormElement(element)) return true;
  
  // Form-related clicks (checkboxes, radio buttons, dropdowns)
  if (type === 'click' && isFormControl(element)) return true;
  
  return false;
}

function isNavigation(event: any): boolean {
  return event.type === 'navigate' || event.type === 'page_load';
}

function isButtonAction(event: any): boolean {
  const { type, element } = event;
  
  if (type !== 'click') return false;
  
  // Important buttons
  const buttonText = element.text?.toLowerCase() || '';
  const importantButtons = [
    'submit', 'save', 'next', 'continue', 'back', 'previous',
    'login', 'logout', 'sign in', 'sign up', 'register',
    'apply', 'send', 'confirm', 'cancel', 'delete', 'edit',
    'upload', 'browse', 'choose file', 'search', 'filter'
  ];
  
  return importantButtons.some(btn => buttonText.includes(btn)) || 
         element.tag === 'button' || 
         element.role === 'button';
}

function isFormElement(element: any): boolean {
  if (!element) return false;
  
  const formTags = ['input', 'textarea', 'select'];
  return formTags.includes(element.tag);
}

function isFormControl(element: any): boolean {
  if (!element) return false;
  
  const formControls = ['checkbox', 'radio', 'select', 'option'];
  return formControls.includes(element.type) || 
         element.role === 'checkbox' || 
         element.role === 'radio';
}

function getFormAction(event: any): string {
  const { type, element, value } = event;
  
  if (type === 'input') {
    if (element.type === 'checkbox') return 'checkbox_toggle';
    if (element.type === 'radio') return 'radio_select';
    if (element.type === 'select') return 'dropdown_select';
    if (value && value.length > 0) return 'text_input';
    return 'field_clear';
  }
  
  if (type === 'click') {
    if (element.type === 'checkbox') return 'checkbox_toggle';
    if (element.type === 'radio') return 'radio_select';
    return 'field_focus';
  }
  
  return 'form_interaction';
}

function getButtonAction(text: string, selector: string): string {
  const buttonText = text?.toLowerCase() || '';
  
  if (buttonText.includes('submit') || buttonText.includes('save')) return 'form_submit';
  if (buttonText.includes('next') || buttonText.includes('continue')) return 'next_step';
  if (buttonText.includes('back') || buttonText.includes('previous')) return 'previous_step';
  if (buttonText.includes('login') || buttonText.includes('sign in')) return 'authentication';
  if (buttonText.includes('apply')) return 'job_apply';
  if (buttonText.includes('upload') || buttonText.includes('browse')) return 'file_upload';
  if (buttonText.includes('search')) return 'search';
  if (buttonText.includes('filter')) return 'filter';
  
  return 'button_click';
}

function detectFormContext(selector: string): string | undefined {
  // Extract form context from selector
  const formMatch = selector.match(/form\[.*?\]/);
  if (formMatch) return formMatch[0];
  
  // Look for common form patterns
  if (selector.includes('login')) return 'login_form';
  if (selector.includes('register')) return 'registration_form';
  if (selector.includes('apply')) return 'application_form';
  if (selector.includes('contact')) return 'contact_form';
  
  return undefined;
}

function detectFormStep(url: string, selector: string): string | undefined {
  // Detect form step from URL patterns
  if (url.includes('/step/') || url.includes('/page/')) {
    const stepMatch = url.match(/\/(step|page)\/(\d+)/);
    if (stepMatch) return `step_${stepMatch[2]}`;
  }
  
  // Detect from form context
  if (selector.includes('personal')) return 'personal_info';
  if (selector.includes('contact')) return 'contact_info';
  if (selector.includes('experience')) return 'experience';
  if (selector.includes('education')) return 'education';
  if (selector.includes('skills')) return 'skills';
  
  return undefined;
}

function getFormImportance(element: any, value: any): 'high' | 'medium' | 'low' {
  // High importance: required fields, critical inputs
  if (element.required || element.placeholder?.includes('required')) return 'high';
  if (element.type === 'email' || element.type === 'password') return 'high';
  if (element.name?.includes('name') || element.name?.includes('email')) return 'high';
  
  // Medium importance: form fields with values
  if (value && value.length > 0) return 'medium';
  if (isFormElement(element)) return 'medium';
  
  return 'low';
}

function getButtonImportance(text: string, selector: string): 'high' | 'medium' | 'low' {
  const buttonText = text?.toLowerCase() || '';
  
  // High importance: critical actions
  if (buttonText.includes('submit') || buttonText.includes('apply')) return 'high';
  if (buttonText.includes('login') || buttonText.includes('sign in')) return 'high';
  if (buttonText.includes('save') || buttonText.includes('confirm')) return 'high';
  
  // Medium importance: navigation buttons
  if (buttonText.includes('next') || buttonText.includes('continue')) return 'medium';
  if (buttonText.includes('back') || buttonText.includes('previous')) return 'medium';
  
  return 'low';
}

function generateId(): string {
  return 'critical_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}
