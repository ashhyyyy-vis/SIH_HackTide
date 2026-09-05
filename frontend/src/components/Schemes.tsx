import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Scheme {
  id: number;
  title: string;
  max_amount: number;
  interest_rate_min: number;
  interest_rate_max: number;
  target_category: string;
  title_i18n: any;
}

const Schemes: React.FC = () => {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [filteredSchemes, setFilteredSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [language, setLanguage] = useState<string>('en');

  useEffect(() => {
    fetchSchemes();
  }, [categoryFilter, language]);

  const fetchSchemes = async () => {
    setLoading(true);
    try {
      const params: any = { lang: language };
      if (categoryFilter !== 'ALL') {
        params.category = categoryFilter;
      }

      const response = await axios.get('/api/schemes', { params });
      setSchemes(response.data.schemes);
      setFilteredSchemes(response.data.schemes);
    } catch (error) {
      console.error('Error fetching schemes:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Government Schemes</h1>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Category:</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Categories</option>
                <option value="SC">SC</option>
                <option value="ST">ST</option>
                <option value="General">General</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Language:</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="en">English</option>
                <option value="hi">हि�ndi</option>
                <option value="ta">Tamil</option>
              </select>
            </div>
          </div>
        </div>

        {/* Schemes List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredSchemes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No schemes found for the selected criteria.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredSchemes.map((scheme) => (
              <div key={scheme.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-3">
                    {scheme.title}
                  </h3>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span className="font-medium">Max Amount:</span>
                      <span className="text-green-600 font-semibold">
                        {formatCurrency(scheme.max_amount)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="font-medium">Interest Rate:</span>
                      <span>
                        {scheme.interest_rate_min}% - {scheme.interest_rate_max}%
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="font-medium">Category:</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {scheme.target_category}
                      </span>
                    </div>
                  </div>

                  <button className="mt-4 w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition font-medium">
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Schemes;
