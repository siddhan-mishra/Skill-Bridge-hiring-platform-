import React, { useState } from 'react';
import { suggestSkills } from '../../api/jobApi';

/**
 * SkillSuggestChips
 * Drop this component into JobCreatePage / JobEditPage.
 * It calls the NLP /suggest-skills endpoint and renders clickable chips.
 * When a chip is clicked, the parent's addSkill(skill) callback is invoked.
 *
 * Props:
 *   title       — current job title from form
 *   description — current job description from form
 *   addSkill    — (skill: string) => void  callback to add chip to the skill list
 *   currentSkills — string[] already added (to show as selected)
 */
export default function SkillSuggestChips({ title, description, addSkill, currentSkills = [] }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  const handleSuggest = async () => {
    if (!title && !description) {
      setError('Add a job title or description first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await suggestSkills(title, description);
      setSuggestions(res.data.skills || []);
    } catch {
      setError('Could not fetch suggestions. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const added = new Set(currentSkills.map(s => s.toLowerCase()));

  return (
    <div className="skill-suggest-container">
      <button
        type="button"
        className="btn-suggest"
        onClick={handleSuggest}
        disabled={loading}
      >
        {loading ? '⏳ Thinking...' : '✨ Suggest Skills with AI'}
      </button>

      {error && <p className="suggest-error">{error}</p>}

      {suggestions.length > 0 && (
        <div className="suggest-chips-wrap">
          <p className="suggest-hint">Click to add:</p>
          <div className="suggest-chips">
            {suggestions.map((skill) => {
              const isAdded = added.has(skill.toLowerCase());
              return (
                <button
                  key={skill}
                  type="button"
                  className={`chip ${isAdded ? 'chip--added' : 'chip--available'}`}
                  onClick={() => !isAdded && addSkill(skill)}
                  title={isAdded ? 'Already added' : `Add "${skill}"`}
                >
                  {isAdded ? `✓ ${skill}` : `+ ${skill}`}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
