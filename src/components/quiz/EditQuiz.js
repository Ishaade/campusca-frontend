import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// (ID normalization handled elsewhere where needed)

function EditQuiz() {
  const { roomId, quizId } = useParams();
  const navigate = useNavigate();
  const { apiRequest } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    timeLimit: 30,
    scheduledStart: '',
    scheduledEnd: '',
    attemptsAllowed: 1,
    shuffleQuestions: false,
    shuffleOptions: false,
    questions: []
  });

  useEffect(() => {
    // Load quiz data from API
    const loadQuiz = async () => {
      try {
        setLoading(true);
        const data = await apiRequest(`/api/quizzes/${quizId}`);

        if (!data) {
          setError('Quiz not found');
          return;
        }

        // Ensure questions have courseOutcome and bloomsTaxonomy fields (for backward compatibility)
        const questionsWithMetadata = (data.questions || []).map(q => ({
          ...q,
          courseOutcome: q.courseOutcome || '',
          bloomsTaxonomy: q.bloomsTaxonomy || ''
        }));

        // Format datetime-local values from ISO strings
        const formatDateTimeLocal = (isoString) => {
          if (!isoString) return '';
          const date = new Date(isoString);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          return `${year}-${month}-${day}T${hours}:${minutes}`;
        };

        setFormData({
          title: data.title || '',
          description: data.description || '',
          timeLimit: data.timeLimit || 30,
          scheduledStart: formatDateTimeLocal(data.scheduledStart),
          scheduledEnd: formatDateTimeLocal(data.scheduledEnd),
          attemptsAllowed: data.attemptsAllowed || 1,
          shuffleQuestions: !!data.shuffleQuestions,
          shuffleOptions: !!data.shuffleOptions,
          questions: questionsWithMetadata
        });
      } catch (err) {
        console.error(err);
        setError(err.message || 'Failed to load quiz');
      } finally {
        setLoading(false);
      }
    };

    loadQuiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId, roomId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleQuestionChange = (questionId, field, value) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map(q => 
        q.id === questionId ? { ...q, [field]: value } : q
      )
    }));
  };

  const handleOptionChange = (questionId, optionIndex, value) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map(q => 
        q.id === questionId 
          ? { 
              ...q, 
              options: q.options.map((opt, idx) => 
                idx === optionIndex ? value : opt
              )
            } 
          : q
      )
    }));
  };

  const addQuestion = () => {
    const newQuestion = {
      id: Math.max(0, ...formData.questions.map(q => q.id)) + 1,
      question: '',
      type: 'multiple-choice',
      options: ['', '', '', ''],
      correctAnswer: 0,
      sampleAnswer: '',
      points: 1,
      courseOutcome: '',
      bloomsTaxonomy: ''
    };
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
  };

  const removeQuestion = (questionId) => {
    if (formData.questions.length > 1) {
      setFormData(prev => ({
        ...prev,
        questions: prev.questions.filter(q => q.id !== questionId)
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Validate form
      if (!formData.title.trim()) {
        setError('Quiz title is required');
        return;
      }

      if (formData.questions.length === 0) {
        setError('Quiz must have at least one question');
        return;
      }

      if (formData.questions.some(q => !q.question.trim())) {
        setError('All questions must have text');
        return;
      }

      if (formData.questions.some(q => q.type === 'multiple-choice' && q.options.some(opt => !opt.trim()))) {
        setError('All multiple choice options must be filled');
        return;
      }

      // Validate schedule if provided
      if (formData.scheduledStart && formData.scheduledEnd) {
        const startDate = new Date(formData.scheduledStart);
        const endDate = new Date(formData.scheduledEnd);
        
        if (endDate <= startDate) {
          setError('End date/time must be after start date/time');
          setSaving(false);
          return;
        }
        const windowMinutes = Math.floor((endDate - startDate) / 1000 / 60);
        if (windowMinutes > 0 && formData.timeLimit > windowMinutes) {
          setError('Time limit cannot exceed the scheduled window length');
          setSaving(false);
          return;
        }
      }

      // Update quiz via API
      const payload = {
        title: formData.title,
        description: formData.description,
        timeLimit: formData.timeLimit,
        scheduledStart: formData.scheduledStart ? new Date(formData.scheduledStart).toISOString() : null,
        scheduledEnd: formData.scheduledEnd ? new Date(formData.scheduledEnd).toISOString() : null,
        attemptsAllowed: formData.attemptsAllowed,
        shuffleQuestions: !!formData.shuffleQuestions,
        shuffleOptions: !!formData.shuffleOptions,
        questions: formData.questions,
        totalPoints: formData.questions.reduce((sum, q) => sum + (q.points || 0), 0)
      };

      await apiRequest(`/api/quizzes/${quizId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });

      setSuccess('Quiz updated successfully!');

      // Redirect to quiz management after 2 seconds
      setTimeout(() => {
        navigate(`/room/${roomId}/manage-quizzes`);
      }, 2000);

    } catch (err) {
      setError('Failed to update quiz. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error && !formData.title) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate(`/room/${roomId}/manage-quizzes`)}
            className="btn btn-primary"
          >
            Back to Quiz Management
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Quiz</h1>
              <p className="text-gray-600">Update quiz details and questions</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/room/${roomId}/manage-quizzes`)}
                className="btn btn-secondary"
              >
                Back to Management
              </button>
              <button
                onClick={() => navigate('/teacher')}
                className="btn btn-primary"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                {success}
              </div>
            )}

            {/* Quiz Basic Info */}
            <div className="card">
              <h2 className="text-xl font-bold mb-6">Quiz Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-group">
                  <label htmlFor="title" className="form-label">
                    Quiz Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="e.g., Math Chapter 5 Quiz"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="timeLimit" className="form-label">
                    Time Limit (minutes)
                  </label>
                  <input
                    type="number"
                    id="timeLimit"
                    name="timeLimit"
                    value={formData.timeLimit}
                    onChange={handleChange}
                    className="form-input"
                    min="1"
                    max="180"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="description" className="form-label">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="form-input"
                  rows="3"
                  placeholder="Brief description of the quiz..."
                />
              </div>

              {/* Schedule Settings */}
              <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-semibold mb-4">Schedule Settings (Optional)</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Set a schedule to automatically control when students can take this quiz. Leave empty for always available.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-group">
                    <label htmlFor="scheduledStart" className="form-label">
                      Start Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      id="scheduledStart"
                      name="scheduledStart"
                      value={formData.scheduledStart}
                      onChange={handleChange}
                      className="form-input"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Quiz will become available at this time
                    </p>
                  </div>

                  <div className="form-group">
                    <label htmlFor="scheduledEnd" className="form-label">
                      End Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      id="scheduledEnd"
                      name="scheduledEnd"
                      value={formData.scheduledEnd}
                      onChange={handleChange}
                      className="form-input"
                      min={formData.scheduledStart || ''}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Quiz will close at this time
                    </p>
                  </div>
                </div>
              </div>

              {/* Attempts Allowed */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div className="form-group">
                  <label htmlFor="attemptsAllowed" className="form-label">Attempts Allowed</label>
                  <input
                    type="number"
                    id="attemptsAllowed"
                    name="attemptsAllowed"
                    value={formData.attemptsAllowed}
                    onChange={handleChange}
                    className="form-input"
                    min="1"
                    max="10"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Shuffle Settings</label>
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="shuffleQuestions" checked={!!formData.shuffleQuestions} onChange={(e)=> setFormData(prev=>({...prev, shuffleQuestions: e.target.checked}))} />
                      Shuffle Questions
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="shuffleOptions" checked={!!formData.shuffleOptions} onChange={(e)=> setFormData(prev=>({...prev, shuffleOptions: e.target.checked}))} />
                      Shuffle Options
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Questions */}
            <div className="card">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Questions ({formData.questions.length})</h2>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="btn btn-primary"
                >
                  Add Question
                </button>
              </div>

              <div className="space-y-6">
                {formData.questions.map((question, index) => (
                  <div key={question.id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-medium">Question {index + 1}</h3>
                      {formData.questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuestion(question.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {/* Question Text */}
                      <div className="form-group">
                        <label className="form-label">Question Text *</label>
                        <textarea
                          value={question.question}
                          onChange={(e) => handleQuestionChange(question.id, 'question', e.target.value)}
                          className="form-input"
                          rows="2"
                          placeholder="Enter your question..."
                          required
                        />
                      </div>

                      {/* Question Type */}
                      <div className="form-group">
                        <label className="form-label">Question Type</label>
                        <select
                          value={question.type}
                          onChange={(e) => handleQuestionChange(question.id, 'type', e.target.value)}
                          className="form-input"
                        >
                          <option value="multiple-choice">Multiple Choice</option>
                          <option value="true-false">True/False</option>
                          <option value="short-answer">Short Answer</option>
                        </select>
                      </div>

                      {/* Options for Multiple Choice */}
                      {question.type === 'multiple-choice' && (
                        <div className="form-group">
                          <label className="form-label">Answer Options *</label>
                          <div className="space-y-2">
                            {question.options.map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center space-x-3">
                                <input
                                  type="radio"
                                  name={`correct-${question.id}`}
                                  checked={question.correctAnswer === optionIndex}
                                  onChange={() => handleQuestionChange(question.id, 'correctAnswer', optionIndex)}
                                  className="h-4 w-4 text-blue-600"
                                />
                                <input
                                  type="text"
                                  value={option}
                                  onChange={(e) => handleOptionChange(question.id, optionIndex, e.target.value)}
                                  className="form-input flex-1"
                                  placeholder={`Option ${optionIndex + 1}`}
                                  required
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* True/False Options */}
                      {question.type === 'true-false' && (
                        <div className="form-group">
                          <label className="form-label">Correct Answer</label>
                          <div className="space-y-2">
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name={`correct-${question.id}`}
                                checked={question.correctAnswer === 0}
                                onChange={() => handleQuestionChange(question.id, 'correctAnswer', 0)}
                                className="h-4 w-4 text-blue-600 mr-2"
                              />
                              True
                            </label>
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name={`correct-${question.id}`}
                                checked={question.correctAnswer === 1}
                                onChange={() => handleQuestionChange(question.id, 'correctAnswer', 1)}
                                className="h-4 w-4 text-blue-600 mr-2"
                              />
                              False
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Short Answer Options */}
                      {question.type === 'short-answer' && (
                        <div className="form-group">
                          <label className="form-label">Sample Answer (Optional)</label>
                          <input
                            type="text"
                            value={question.sampleAnswer || ''}
                            onChange={(e) => handleQuestionChange(question.id, 'sampleAnswer', e.target.value)}
                            className="form-input"
                            placeholder="Enter a sample answer (optional)"
                          />
                          <p className="text-sm text-gray-500 mt-1">
                            This is just for reference. Students will be graded based on their response content.
                          </p>
                        </div>
                      )}

                      {/* Points */}
                      <div className="form-group">
                        <label className="form-label">Points</label>
                        <input
                          type="number"
                          value={question.points}
                          onChange={(e) => handleQuestionChange(question.id, 'points', parseInt(e.target.value))}
                          className="form-input w-20"
                          min="1"
                          max="100"
                        />
                      </div>

                      {/* Course Outcome */}
                      <div className="form-group">
                        <label className="form-label">Course Outcome</label>
                        <input
                          type="text"
                          value={question.courseOutcome || ''}
                          onChange={(e) => handleQuestionChange(question.id, 'courseOutcome', e.target.value)}
                          className="form-input"
                          placeholder="e.g., CO1, CO2, or description of learning outcome"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          Enter the course outcome or learning objective this question addresses
                        </p>
                      </div>

                      {/* Bloom's Taxonomy */}
                      <div className="form-group">
                        <label className="form-label">Bloom's Taxonomy Level</label>
                        <select
                          value={question.bloomsTaxonomy || ''}
                          onChange={(e) => handleQuestionChange(question.id, 'bloomsTaxonomy', e.target.value)}
                          className="form-input"
                        >
                          <option value="">Select Bloom's Taxonomy Level</option>
                          <option value="remember">Remember - Recall facts and basic concepts</option>
                          <option value="understand">Understand - Explain ideas or concepts</option>
                          <option value="apply">Apply - Use information in new situations</option>
                          <option value="analyze">Analyze - Draw connections among ideas</option>
                          <option value="evaluate">Evaluate - Justify a stand or decision</option>
                          <option value="create">Create - Produce new or original work</option>
                        </select>
                        <p className="text-sm text-gray-500 mt-1">
                          Select the cognitive level of this question according to Bloom's Taxonomy
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate(`/room/${roomId}/manage-quizzes`)}
                className="btn btn-secondary flex-1"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary flex-1"
                disabled={saving}
              >
                {saving ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default EditQuiz;

