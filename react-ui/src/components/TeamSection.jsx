import React from 'react';

export default function TeamSection() {
  const team = [
    {
      id: 1,
      name: 'Alex Chen',
      role: 'Lead Developer',
      bio: 'Full-stack engineer passionate about creating interactive puzzle experiences.',
      emoji: '👨‍💻',
    },
    {
      id: 2,
      name: 'Maya Patel',
      role: 'AI Algorithm Specialist',
      bio: 'Expert in solving algorithms and optimization techniques for Sudoku.',
      emoji: '🧠',
    },
    {
      id: 3,
      name: 'Jordan Kim',
      role: 'UI/UX Designer',
      bio: 'Creative designer focused on making complex logic games accessible and fun.',
      emoji: '🎨',
    },
    {
      id: 4,
      name: 'Taylor Rodriguez',
      role: 'Product Manager',
      bio: 'Driving the vision to make Sudoku a competitive gaming platform.',
      emoji: '🚀',
    },
  ];

  return (
    <section className="team-section">
      <div className="team-header">
        <h2>Meet the Team</h2>
        <p>Passionate developers building the ultimate Sudoku Arena experience</p>
      </div>

      <div className="team-grid">
        {team.map(member => (
          <div key={member.id} className="team-member">
            <div className="team-avatar">{member.emoji}</div>
            <h3>{member.name}</h3>
            <div className="team-role">{member.role}</div>
            <p className="team-bio">{member.bio}</p>
            <div className="team-social">
              <button className="team-social-link" title="GitHub">
                <span style={{ fontSize: '1.2rem' }}>📱</span>
              </button>
              <button className="team-social-link" title="Twitter">
                <span style={{ fontSize: '1.2rem' }}>🐦</span>
              </button>
              <button className="team-social-link" title="LinkedIn">
                <span style={{ fontSize: '1.2rem' }}>💼</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
