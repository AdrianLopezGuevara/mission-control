'use client';
import { useState, useEffect } from 'react';
import Modal, { FormField, TextInput, SelectInput, TextArea, FormActions } from './Modal';

interface Member {
  id?: string;
  name: string;
  avatar?: string;
  role?: string;
  description?: string;
  department: string;
  model?: string;
  status?: string;
  skills?: string[];
  spawnLabel?: string;
  isHuman?: boolean;
  isLead?: boolean;
}

export default function MemberModal({ open, onClose, onSave, onDelete, member }: {
  open: boolean;
  onClose: () => void;
  onSave: (m: Member) => void;
  onDelete?: (id: string) => void;
  member?: Member | null;
}) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [role, setRole] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('engineering');
  const [model, setModel] = useState('sonnet');
  const [status, setStatus] = useState('standby');
  const [skills, setSkills] = useState('');
  const [spawnLabel, setSpawnLabel] = useState('');
  const [isHuman, setIsHuman] = useState(false);
  const [isLead, setIsLead] = useState(false);

  useEffect(() => {
    if (member) {
      setName(member.name || '');
      setAvatar(member.avatar || '');
      setRole(member.role || '');
      setDescription(member.description || '');
      setDepartment(member.department || 'engineering');
      setModel(member.model || 'sonnet');
      setStatus(member.status || 'standby');
      setSkills(member.skills?.join(', ') || '');
      setSpawnLabel(member.spawnLabel || '');
      setIsHuman(member.isHuman || false);
      setIsLead(member.isLead || false);
    } else {
      setName(''); setAvatar(''); setRole(''); setDescription('');
      setDepartment('engineering'); setModel('sonnet'); setStatus('standby');
      setSkills(''); setSpawnLabel(''); setIsHuman(false); setIsLead(false);
    }
  }, [member, open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      ...(member?.id ? { id: member.id } : {}),
      name, avatar, role, description, department, model: model || undefined,
      status, skills: skills.split(',').map(s => s.trim()).filter(Boolean),
      spawnLabel, isHuman, isLead,
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={member?.id ? 'Edit Member' : 'New Member'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-[80px_1fr] gap-3">
          <FormField label="Avatar">
            <TextInput value={avatar} onChange={setAvatar} placeholder="M" className="text-center text-lg" />
          </FormField>
          <FormField label="Name">
            <TextInput value={name} onChange={setName} placeholder="Agent name" required />
          </FormField>
        </div>
        <FormField label="Role / Title">
          <TextInput value={role} onChange={setRole} placeholder="Senior Developer" />
        </FormField>
        <FormField label="Description">
          <TextArea value={description} onChange={setDescription} placeholder="What they do..." rows={2} />
        </FormField>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FormField label="Department">
            <SelectInput value={department} onChange={setDepartment} options={[
              { value: 'leadership', label: 'Leadership' }, { value: 'engineering', label: 'Engineering' },
              { value: 'content', label: 'Content' }, { value: 'design', label: 'Design' },
              { value: 'operations', label: 'Operations' },
            ]} />
          </FormField>
          <FormField label="Model">
            <SelectInput value={model} onChange={setModel} options={[
              { value: 'opus', label: 'Opus' }, { value: 'sonnet', label: 'Sonnet' },
              { value: '', label: 'N/A (Human)' },
            ]} />
          </FormField>
          <FormField label="Status">
            <SelectInput value={status} onChange={setStatus} options={[
              { value: 'standby', label: 'Standby' }, { value: 'active', label: 'Active' },
              { value: 'busy', label: 'Busy' },
            ]} />
          </FormField>
        </div>
        <FormField label="Skills" small="comma-separated">
          <TextInput value={skills} onChange={setSkills} placeholder="react, typescript, CSS" />
        </FormField>
        <FormField label="Spawn Label">
          <TextInput value={spawnLabel} onChange={setSpawnLabel} placeholder="bolt" />
        </FormField>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-xs text-text-dim cursor-pointer">
            <input type="checkbox" checked={isHuman} onChange={e => setIsHuman(e.target.checked)}
              className="accent-accent" />
            Human
          </label>
          <label className="flex items-center gap-2 text-xs text-text-dim cursor-pointer">
            <input type="checkbox" checked={isLead} onChange={e => setIsLead(e.target.checked)}
              className="accent-accent" />
            Team Lead
          </label>
        </div>
        <FormActions
          onCancel={onClose}
          onDelete={member?.id ? () => { onDelete?.(member.id!); onClose(); } : undefined}
        />
      </form>
    </Modal>
  );
}
