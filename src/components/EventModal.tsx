'use client';
import { useState, useEffect } from 'react';
import Modal, { FormField, TextInput, SelectInput, TextArea, FormActions } from './Modal';

interface CalEvent {
  id?: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  endTime?: string;
  type: string;
  assignee?: string;
  recurring?: string;
  tags?: string[];
}

export default function EventModal({ open, onClose, onSave, onDelete, event }: {
  open: boolean;
  onClose: () => void;
  onSave: (ev: CalEvent) => void;
  onDelete?: (id: string) => void;
  event?: CalEvent | null;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [type, setType] = useState('event');
  const [assignee, setAssignee] = useState('migi');
  const [recurring, setRecurring] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    if (event) {
      setTitle(event.title || '');
      setDescription(event.description || '');
      setDate(event.date || '');
      setTime(event.time || '');
      setEndTime(event.endTime || '');
      setType(event.type || 'event');
      setAssignee(event.assignee || 'migi');
      setRecurring(event.recurring || '');
      setTags(event.tags?.join(', ') || '');
    } else {
      setTitle(''); setDescription(''); setDate(''); setTime(''); setEndTime('');
      setType('event'); setAssignee('migi'); setRecurring(''); setTags('');
    }
  }, [event, open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      ...(event?.id ? { id: event.id } : {}),
      title, description, date, time, endTime, type, assignee, recurring,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={event?.id ? 'Edit Event' : 'New Event'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Title">
          <TextInput value={title} onChange={setTitle} placeholder="Event name..." required />
        </FormField>
        <FormField label="Description">
          <TextArea value={description} onChange={setDescription} placeholder="Details..." rows={2} />
        </FormField>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FormField label="Date">
            <TextInput value={date} onChange={setDate} type="date" required />
          </FormField>
          <FormField label="Time">
            <TextInput value={time} onChange={setTime} type="time" />
          </FormField>
          <FormField label="End Time">
            <TextInput value={endTime} onChange={setEndTime} type="time" />
          </FormField>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FormField label="Type">
            <SelectInput value={type} onChange={setType} options={[
              { value: 'event', label: 'Event' }, { value: 'cron', label: 'Cron Job' },
              { value: 'reminder', label: 'Reminder' }, { value: 'deadline', label: 'Deadline' },
            ]} />
          </FormField>
          <FormField label="Assignee">
            <SelectInput value={assignee} onChange={setAssignee} options={[
              { value: 'migi', label: 'Migi' }, { value: 'adrian', label: 'Adrian' },
            ]} />
          </FormField>
          <FormField label="Recurring">
            <SelectInput value={recurring} onChange={setRecurring} options={[
              { value: '', label: 'None' }, { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' },
            ]} />
          </FormField>
        </div>
        <FormField label="Tags" small="comma-separated">
          <TextInput value={tags} onChange={setTags} placeholder="heartbeat, check..." />
        </FormField>
        <FormActions
          onCancel={onClose}
          onDelete={event?.id ? () => { onDelete?.(event.id!); onClose(); } : undefined}
        />
      </form>
    </Modal>
  );
}
