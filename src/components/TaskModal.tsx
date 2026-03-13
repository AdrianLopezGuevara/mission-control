'use client';
import { useState, useEffect } from 'react';
import Modal, { FormField, TextInput, SelectInput, TextArea, FormActions } from './Modal';

interface Task {
  id?: string;
  title: string;
  description: string;
  assignee: string;
  priority: string;
  status: string;
  tags: string[];
}

export default function TaskModal({ open, onClose, onSave, onDelete, task }: {
  open: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete?: (id: string) => void;
  task?: Task | null;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState('migi');
  const [priority, setPriority] = useState('normal');
  const [status, setStatus] = useState('backlog');
  const [tags, setTags] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setAssignee(task.assignee || 'migi');
      setPriority(task.priority || 'normal');
      setStatus(task.status || 'backlog');
      setTags(task.tags?.join(', ') || '');
    } else {
      setTitle(''); setDescription(''); setAssignee('migi');
      setPriority('normal'); setStatus('backlog'); setTags('');
    }
  }, [task, open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      ...(task?.id ? { id: task.id } : {}),
      title, description, assignee, priority, status,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={task?.id ? 'Edit Task' : 'New Task'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Title">
          <TextInput value={title} onChange={setTitle} placeholder="What needs doing?" required />
        </FormField>
        <FormField label="Description">
          <TextArea value={description} onChange={setDescription} placeholder="Details..." />
        </FormField>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FormField label="Assignee">
            <SelectInput value={assignee} onChange={setAssignee} options={[
              { value: 'migi', label: 'Migi' }, { value: 'adrian', label: 'Adrian' },
            ]} />
          </FormField>
          <FormField label="Priority">
            <SelectInput value={priority} onChange={setPriority} options={[
              { value: 'low', label: 'Low' }, { value: 'normal', label: 'Normal' },
              { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' },
            ]} />
          </FormField>
          <FormField label="Status">
            <SelectInput value={status} onChange={setStatus} options={[
              { value: 'backlog', label: 'Backlog' }, { value: 'in-progress', label: 'In Progress' },
              { value: 'review', label: 'Review' }, { value: 'done', label: 'Done' },
            ]} />
          </FormField>
        </div>
        <FormField label="Tags" small="comma-separated">
          <TextInput value={tags} onChange={setTags} placeholder="frontend, rodin" />
        </FormField>
        <FormActions
          onCancel={onClose}
          onDelete={task?.id ? () => { onDelete?.(task.id!); onClose(); } : undefined}
        />
      </form>
    </Modal>
  );
}
