import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface SafetyBannerProps {
  message?: string;
}

export const SafetyBanner: React.FC<SafetyBannerProps> = ({ message }) => {
  return (
    <div className="bg-passion-50 border border-passion-200 rounded-2xl p-4 flex items-start gap-3.5 shadow-sm">
      <div className="w-9 h-9 rounded-xl bg-passion-100 flex items-center justify-center text-passion-600 flex-shrink-0">
        <ShieldAlert className="w-5 h-5" />
      </div>
      <div>
        <div className="text-sm font-semibold text-passion-800">
          Từ chối theo tiêu chuẩn an toàn & ranh giới đạo đức
        </div>
        <div className="text-xs text-charcoal-muted mt-1 leading-relaxed">
          {message || 'Coach từ chối tìm kiếm, xếp hạng danh tính thật, đóng vai nhạy cảm hoặc tạo mồi nhử thao túng người khác.'}
        </div>
      </div>
    </div>
  );
};

