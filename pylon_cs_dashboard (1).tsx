import React, { useState } from 'react';
import { BarChart, Bar, LineChart, Line, ScatterChart, Scatter, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, MessageSquare, Zap, Target, Award } from 'lucide-react';

export default function PylonCSDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  // KPI Metrics Data
  const topAICustomers = [
    { company: 'TechCorp Global', arr: 250000, ai_adoption: 95, ai_tickets_pct: 78, seats: 45, industry: 'SaaS' },
    { company: 'FinServe Inc', arr: 180000, ai_adoption: 87, ai_tickets_pct: 72, seats: 32, industry: 'Finance' },
    { company: 'CloudScale Systems', arr: 150000, ai_adoption: 92, ai_tickets_pct: 85, seats: 28, industry: 'Cloud' },
    { company: 'DataStream Co', arr: 200000, ai_adoption: 88, ai_tickets_pct: 68, seats: 38, industry: 'Analytics' },
    { company: 'NextGen Platform', arr: 175000, ai_adoption: 81, ai_tickets_pct: 61, seats: 25, industry: 'SaaS' },
  ];

  const referenceCustomers = [
    { company: 'TechCorp Global', arr: 250000, seats: 45, health: 95, retention_risk: 'Low', testimonial_ready: true, case_study: true, industry: 'SaaS', monthly_engagement: 98 },
    { company: 'CloudScale Systems', arr: 150000, seats: 28, health: 93, retention_risk: 'Low', testimonial_ready: true, case_study: true, industry: 'Cloud', monthly_engagement: 96 },
    { company: 'FinServe Inc', arr: 180000, seats: 32, health: 91, retention_risk: 'Low', testimonial_ready: false, case_study: false, industry: 'Finance', monthly_engagement: 94 },
    { company: 'DataStream Co', arr: 200000, seats: 38, health: 89, retention_risk: 'Medium', testimonial_ready: true, case_study: true, industry: 'Analytics', monthly_engagement: 88 },
    { company: 'EnterpriseFlow', arr: 220000, seats: 42, health: 87, retention_risk: 'Low', testimonial_ready: true, case_study: false, industry: 'Workflows', monthly_engagement: 92 },
  ];

  const aiAdoptionTrend = [
    { month: 'Jan', adoption_rate: 45, tickets_resolved: 1200 },
    { month: 'Feb', adoption_rate: 52, tickets_resolved: 1450 },
    { month: 'Mar', adoption_rate: 58, tickets_resolved: 1680 },
    { month: 'Apr', adoption_rate: 65, tickets_resolved: 1920 },
    { month: 'May', adoption_rate: 71, tickets_resolved: 2150 },
    { month: 'Jun', adoption_rate: 78, tickets_resolved: 2380 },
  ];

  const aiFeatureUsage = [
    { feature: 'Auto-Reply', usage: 92, satisfaction: 4.8 },
    { feature: 'AI Routing', usage: 87, satisfaction: 4.6 },
    { feature: 'Sentiment Analysis', usage: 73, satisfaction: 4.4 },
    { feature: 'Smart Search', usage: 81, satisfaction: 4.7 },
    { feature: 'Content Suggestions', usage: 68, satisfaction: 4.3 },
    { feature: 'Runbook Automation', usage: 59, satisfaction: 4.5 },
  ];

  const retentionRiskPie = [
    { name: 'Low Risk', value: 65, fill: '#10b981' },
    { name: 'Medium Risk', value: 25, fill: '#f59e0b' },
    { name: 'High Risk', value: 10, fill: '#ef4444' },
  ];

  const StatCard = ({ icon: Icon, label, value, change, color }) => (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {change && (
            <p className={`text-sm mt-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% vs last month
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Pylon Customer Success Dashboard</h1>
        <p className="text-gray-600 mt-2">AI Feature Adoption & Reference Customer Intelligence</p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-4 mb-8 border-b border-gray-200">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'ai_champions', label: 'AI Champions' },
          { id: 'references', label: 'Reference Customers' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard icon={Zap} label="Avg AI Adoption Rate" value="78%" change={8} color="bg-blue-600" />
            <StatCard icon={TrendingUp} label="Enterprise AI Users" value="142" change={12} color="bg-green-600" />
            <StatCard icon={Users} label="Ready References" value="34" change={5} color="bg-purple-600" />
            <StatCard icon={Award} label="Reference Success Rate" value="89%" change={3} color="bg-yellow-600" />
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* AI Adoption Trend */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Adoption Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={aiAdoptionTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="adoption_rate" stroke="#3b82f6" name="Adoption Rate (%)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Retention Risk Distribution */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Retention Risk Profile</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={retentionRiskPie} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}%`} outerRadius={80} dataKey="value">
                    {retentionRiskPie.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Feature Adoption & Satisfaction</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={aiFeatureUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="feature" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip />
                <Legend />
                <Bar dataKey="usage" fill="#3b82f6" name="Usage (%)" />
                <Bar dataKey="satisfaction" fill="#10b981" name="Satisfaction (NPS)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* AI CHAMPIONS TAB */}
      {activeTab === 'ai_champions' && (
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Top Enterprise AI Adopters</h2>
            <p className="text-gray-600">Identifying customers with highest AI feature engagement and revenue impact</p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Adoption Scorecard</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topAICustomers}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="company" angle={-45} textAnchor="end" height={100} stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip />
                <Legend />
                <Bar dataKey="ai_adoption" fill="#3b82f6" name="AI Adoption (%)" />
                <Bar dataKey="ai_tickets_pct" fill="#8b5cf6" name="AI-Resolved Tickets (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top AI Customers Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Company</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ARR</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">AI Adoption</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">AI Tickets %</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Seats</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Industry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {topAICustomers.map((customer, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{customer.company}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">${(customer.arr / 1000).toFixed(0)}K</td>
                      <td className="px-6 py-4 text-sm"><span className="bg-green-100 text-green-800 px-2 py-1 rounded">{customer.ai_adoption}%</span></td>
                      <td className="px-6 py-4 text-sm text-gray-600">{customer.ai_tickets_pct}%</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{customer.seats}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{customer.industry}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REFERENCE CUSTOMERS TAB */}
      {activeTab === 'references' && (
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Reference Customer Intelligence</h2>
            <p className="text-gray-600">Enterprise customers qualified for case studies, testimonials, and deal acceleration</p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">ARR vs Health Score (Bubble size = Seats)</h3>
            <ResponsiveContainer width="100%" height={350}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="arr" name="ARR" stroke="#6b7280" />
                <YAxis dataKey="health" name="Health Score" stroke="#6b7280" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                  if (active && payload && payload[0]) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-2 border border-gray-300 rounded shadow">
                        <p className="font-semibold">{data.company}</p>
                        <p className="text-sm">ARR: ${(data.arr/1000).toFixed(0)}K</p>
                        <p className="text-sm">Health: {data.health}%</p>
                        <p className="text-sm">Seats: {data.seats}</p>
                      </div>
                    );
                  }
                  return null;
                }} />
                <Scatter name="Reference Customers" data={referenceCustomers} fill="#3b82f6" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Reference Customers Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Company</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ARR</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Health</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Engagement</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Testimonial</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Case Study</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {referenceCustomers.map((customer, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{customer.company}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">${(customer.arr / 1000).toFixed(0)}K</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded ${customer.health >= 90 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {customer.health}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{customer.monthly_engagement}%</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={customer.testimonial_ready ? 'text-green-600 font-semibold' : 'text-gray-400'}>
                          {customer.testimonial_ready ? '✓ Ready' : '○ Not Ready'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={customer.case_study ? 'text-green-600 font-semibold' : 'text-gray-400'}>
                          {customer.case_study ? '✓ Ready' : '○ Not Ready'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          customer.retention_risk === 'Low' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {customer.retention_risk}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}