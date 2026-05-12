import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreatePropertyTemplateDialog } from './CreatePropertyTemplateDialog';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: vi.fn(),
  }),
  LanguageProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/contexts/AnalyticsContext', () => ({
  useAnalyticsContext: () => ({
    trackEvent: vi.fn(),
  }),
  AnalyticsProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('CreatePropertyTemplateDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('should render the dialog when open', async () => {
    render(
      <CreatePropertyTemplateDialog open={true} onOpenChange={vi.fn()} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText('configuration.documentTemplates.createTemplate')).toBeInTheDocument();
  });

  it('should not render the dialog when closed', async () => {
    render(
      <CreatePropertyTemplateDialog open={false} onOpenChange={vi.fn()} />,
      { wrapper: TestWrapper }
    );

    expect(screen.queryByText('configuration.documentTemplates.createTemplate')).not.toBeInTheDocument();
  });

  it('should display file select section', async () => {
    render(
      <CreatePropertyTemplateDialog open={true} onOpenChange={vi.fn()} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText('dialogs.selectFile')).toBeInTheDocument();
    expect(screen.getByText('dialogs.dragDropFile')).toBeInTheDocument();
    expect(screen.getByText('dialogs.allowedTypes')).toBeInTheDocument();
  });

  it('should update title input value', async () => {
    const user = userEvent.setup();
    render(
      <CreatePropertyTemplateDialog open={true} onOpenChange={vi.fn()} />,
      { wrapper: TestWrapper }
    );

    const titleInput = screen.getByLabelText(/dialogs.templateName/i);
    await user.type(titleInput, 'Test Document Template');

    expect(titleInput).toHaveValue('Test Document Template');
  });

  it('should update description input value', async () => {
    const user = userEvent.setup();
    render(
      <CreatePropertyTemplateDialog open={true} onOpenChange={vi.fn()} />,
      { wrapper: TestWrapper }
    );

    const descInput = screen.getByLabelText(/dialogs.descriptionOptional/i);
    await user.type(descInput, 'This is a test description');

    expect(descInput).toHaveValue('This is a test description');
  });

  it('should show drag and drop zone when no file selected', async () => {
    render(
      <CreatePropertyTemplateDialog open={true} onOpenChange={vi.fn()} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText(/dialogs.dragDropFile/i)).toBeInTheDocument();
  });

  it('should show save button', async () => {
    render(
      <CreatePropertyTemplateDialog open={true} onOpenChange={vi.fn()} />,
      { wrapper: TestWrapper }
    );

    const saveButton = screen.getByRole('button', { name: /common.save/i });
    expect(saveButton).toBeInTheDocument();
  });

  it('should show cancel button', async () => {
    render(
      <CreatePropertyTemplateDialog open={true} onOpenChange={vi.fn()} />,
      { wrapper: TestWrapper }
    );

    const cancelButton = screen.getByRole('button', { name: /common.cancel/i });
    expect(cancelButton).toBeInTheDocument();
  });

  it('should call onOpenChange(false) when cancel is clicked', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <CreatePropertyTemplateDialog open={true} onOpenChange={onOpenChange} />,
      { wrapper: TestWrapper }
    );

    const cancelButton = screen.getByRole('button', { name: /common.cancel/i });
    await user.click(cancelButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should disable save button when no file selected', async () => {
    render(
      <CreatePropertyTemplateDialog open={true} onOpenChange={vi.fn()} />,
      { wrapper: TestWrapper }
    );

    const saveButton = screen.getByRole('button', { name: /common.save/i });
    expect(saveButton).toBeDisabled();
  });

  it('should enable save button when file is selected and title is provided', async () => {
    const user = userEvent.setup();
    render(
      <CreatePropertyTemplateDialog open={true} onOpenChange={vi.fn()} />,
      { wrapper: TestWrapper }
    );

    const titleInput = screen.getByLabelText(/dialogs.templateName/i);
    await user.type(titleInput, 'Test Template');

    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    if (fileInput) {
      fireEvent.change(fileInput, {
        target: { files: [file] }
      });
    }

    await waitFor(() => {
      const saveButton = screen.getByRole('button', { name: /common.save/i });
      expect(saveButton).not.toBeDisabled();
    });
  });

  it('should show selected file name when file is chosen', async () => {
    render(
      <CreatePropertyTemplateDialog open={true} onOpenChange={vi.fn()} />,
      { wrapper: TestWrapper }
    );

    const file = new File(['test content'], 'lease_agreement.pdf', { type: 'application/pdf' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    if (fileInput) {
      fireEvent.change(fileInput, {
        target: { files: [file] }
      });
    }

    await waitFor(() => {
      expect(screen.getByText('lease_agreement.pdf')).toBeInTheDocument();
    });
  });

  it('should show allowed file types info', async () => {
    render(
      <CreatePropertyTemplateDialog open={true} onOpenChange={vi.fn()} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText(/dialogs.allowedTypes/i)).toBeInTheDocument();
  });

  it('should reject files with invalid type', async () => {
    const user = userEvent.setup();
    render(
      <CreatePropertyTemplateDialog open={true} onOpenChange={vi.fn()} />,
      { wrapper: TestWrapper }
    );

    const invalidFile = new File(['test content'], 'test.exe', { type: 'application/x-msdownload' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    if (fileInput) {
      fireEvent.change(fileInput, {
        target: { files: [invalidFile] }
      });
    }

    await waitFor(() => {
      expect(screen.queryByText('test.exe')).not.toBeInTheDocument();
    });
  });

  it('should accept docx files', async () => {
    render(
      <CreatePropertyTemplateDialog open={true} onOpenChange={vi.fn()} />,
      { wrapper: TestWrapper }
    );

    const file = new File(['test content'], 'contract.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    if (fileInput) {
      fireEvent.change(fileInput, {
        target: { files: [file] }
      });
    }

    await waitFor(() => {
      expect(screen.getByText('contract.docx')).toBeInTheDocument();
    });
  });
});
