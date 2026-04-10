-- Job documents: QuickMeasure / measurements PDFs as first-class type
ALTER TYPE public.doc_type ADD VALUE IF NOT EXISTS 'measurements';
