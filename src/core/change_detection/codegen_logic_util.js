'use strict';var lang_1 = require('angular2/src/facade/lang');
var codegen_facade_1 = require('./codegen_facade');
var proto_record_1 = require('./proto_record');
var constants_1 = require('./constants');
var exceptions_1 = require('angular2/src/facade/exceptions');
/**
 * Class responsible for providing change detection logic for change detector classes.
 */
var CodegenLogicUtil = (function () {
    function CodegenLogicUtil(_names, _utilName, _changeDetectorStateName, _changeDetection) {
        this._names = _names;
        this._utilName = _utilName;
        this._changeDetectorStateName = _changeDetectorStateName;
        this._changeDetection = _changeDetection;
    }
    /**
     * Generates a statement which updates the local variable representing `protoRec` with the current
     * value of the record. Used by property bindings.
     */
    CodegenLogicUtil.prototype.genPropertyBindingEvalValue = function (protoRec) {
        var _this = this;
        return this._genEvalValue(protoRec, function (idx) { return _this._names.getLocalName(idx); }, this._names.getLocalsAccessorName());
    };
    /**
     * Generates a statement which updates the local variable representing `protoRec` with the current
     * value of the record. Used by event bindings.
     */
    CodegenLogicUtil.prototype.genEventBindingEvalValue = function (eventRecord, protoRec) {
        var _this = this;
        return this._genEvalValue(protoRec, function (idx) { return _this._names.getEventLocalName(eventRecord, idx); }, "locals");
    };
    CodegenLogicUtil.prototype._genEvalValue = function (protoRec, getLocalName, localsAccessor) {
        var context = (protoRec.contextIndex == -1) ?
            this._names.getDirectiveName(protoRec.directiveIndex) :
            getLocalName(protoRec.contextIndex);
        var argString = protoRec.args.map(function (arg) { return getLocalName(arg); }).join(", ");
        var rhs;
        switch (protoRec.mode) {
            case proto_record_1.RecordType.Self:
                rhs = context;
                break;
            case proto_record_1.RecordType.Const:
                rhs = codegen_facade_1.codify(protoRec.funcOrValue);
                break;
            case proto_record_1.RecordType.PropertyRead:
                rhs = this._observe(context + "." + protoRec.name, protoRec);
                break;
            case proto_record_1.RecordType.SafeProperty:
                var read = this._observe(context + "." + protoRec.name, protoRec);
                rhs =
                    this._utilName + ".isValueBlank(" + context + ") ? null : " + this._observe(read, protoRec);
                break;
            case proto_record_1.RecordType.PropertyWrite:
                rhs = context + "." + protoRec.name + " = " + getLocalName(protoRec.args[0]);
                break;
            case proto_record_1.RecordType.Local:
                rhs = this._observe(localsAccessor + ".get(" + codegen_facade_1.rawString(protoRec.name) + ")", protoRec);
                break;
            case proto_record_1.RecordType.InvokeMethod:
                rhs = this._observe(context + "." + protoRec.name + "(" + argString + ")", protoRec);
                break;
            case proto_record_1.RecordType.SafeMethodInvoke:
                var invoke = context + "." + protoRec.name + "(" + argString + ")";
                rhs =
                    this._utilName + ".isValueBlank(" + context + ") ? null : " + this._observe(invoke, protoRec);
                break;
            case proto_record_1.RecordType.InvokeClosure:
                rhs = context + "(" + argString + ")";
                break;
            case proto_record_1.RecordType.PrimitiveOp:
                rhs = this._utilName + "." + protoRec.name + "(" + argString + ")";
                break;
            case proto_record_1.RecordType.CollectionLiteral:
                rhs = this._utilName + "." + protoRec.name + "(" + argString + ")";
                break;
            case proto_record_1.RecordType.Interpolate:
                rhs = this._genInterpolation(protoRec);
                break;
            case proto_record_1.RecordType.KeyedRead:
                rhs = this._observe(context + "[" + getLocalName(protoRec.args[0]) + "]", protoRec);
                break;
            case proto_record_1.RecordType.KeyedWrite:
                rhs = context + "[" + getLocalName(protoRec.args[0]) + "] = " + getLocalName(protoRec.args[1]);
                break;
            case proto_record_1.RecordType.Chain:
                rhs = 'null';
                break;
            default:
                throw new exceptions_1.BaseException("Unknown operation " + protoRec.mode);
        }
        return getLocalName(protoRec.selfIndex) + " = " + rhs + ";";
    };
    /** @internal */
    CodegenLogicUtil.prototype._observe = function (exp, rec) {
        // This is an experimental feature. Works only in Dart.
        if (this._changeDetection === constants_1.ChangeDetectionStrategy.OnPushObserve) {
            return "this.observeValue(" + exp + ", " + rec.selfIndex + ")";
        }
        else {
            return exp;
        }
    };
    CodegenLogicUtil.prototype.genPropertyBindingTargets = function (propertyBindingTargets, genDebugInfo) {
        var _this = this;
        var bs = propertyBindingTargets.map(function (b) {
            if (lang_1.isBlank(b))
                return "null";
            var debug = genDebugInfo ? codegen_facade_1.codify(b.debug) : "null";
            return _this._utilName + ".bindingTarget(" + codegen_facade_1.codify(b.mode) + ", " + b.elementIndex + ", " + codegen_facade_1.codify(b.name) + ", " + codegen_facade_1.codify(b.unit) + ", " + debug + ")";
        });
        return "[" + bs.join(", ") + "]";
    };
    CodegenLogicUtil.prototype.genDirectiveIndices = function (directiveRecords) {
        var _this = this;
        var bs = directiveRecords.map(function (b) {
            return (_this._utilName + ".directiveIndex(" + b.directiveIndex.elementIndex + ", " + b.directiveIndex.directiveIndex + ")");
        });
        return "[" + bs.join(", ") + "]";
    };
    /** @internal */
    CodegenLogicUtil.prototype._genInterpolation = function (protoRec) {
        var iVals = [];
        for (var i = 0; i < protoRec.args.length; ++i) {
            iVals.push(codegen_facade_1.codify(protoRec.fixedArgs[i]));
            iVals.push(this._utilName + ".s(" + this._names.getLocalName(protoRec.args[i]) + ")");
        }
        iVals.push(codegen_facade_1.codify(protoRec.fixedArgs[protoRec.args.length]));
        return codegen_facade_1.combineGeneratedStrings(iVals);
    };
    CodegenLogicUtil.prototype.genHydrateDirectives = function (directiveRecords) {
        var res = [];
        for (var i = 0; i < directiveRecords.length; ++i) {
            var r = directiveRecords[i];
            res.push(this._names.getDirectiveName(r.directiveIndex) + " = " + this._genReadDirective(i) + ";");
        }
        return res.join("\n");
    };
    CodegenLogicUtil.prototype._genReadDirective = function (index) {
        // This is an experimental feature. Works only in Dart.
        if (this._changeDetection === constants_1.ChangeDetectionStrategy.OnPushObserve) {
            return "this.observeDirective(this.getDirectiveFor(directives, " + index + "), " + index + ")";
        }
        else {
            return "this.getDirectiveFor(directives, " + index + ")";
        }
    };
    CodegenLogicUtil.prototype.genHydrateDetectors = function (directiveRecords) {
        var res = [];
        for (var i = 0; i < directiveRecords.length; ++i) {
            var r = directiveRecords[i];
            if (!r.isDefaultChangeDetection()) {
                res.push(this._names.getDetectorName(r.directiveIndex) + " = this.getDetectorFor(directives, " + i + ");");
            }
        }
        return res.join("\n");
    };
    CodegenLogicUtil.prototype.genContentLifecycleCallbacks = function (directiveRecords) {
        var res = [];
        var eq = lang_1.IS_DART ? '==' : '===';
        // NOTE(kegluneq): Order is important!
        for (var i = directiveRecords.length - 1; i >= 0; --i) {
            var dir = directiveRecords[i];
            if (dir.callAfterContentInit) {
                res.push("if(" + this._names.getStateName() + " " + eq + " " + this._changeDetectorStateName + ".NeverChecked) " + this._names.getDirectiveName(dir.directiveIndex) + ".ngAfterContentInit();");
            }
            if (dir.callAfterContentChecked) {
                res.push(this._names.getDirectiveName(dir.directiveIndex) + ".ngAfterContentChecked();");
            }
        }
        return res;
    };
    CodegenLogicUtil.prototype.genViewLifecycleCallbacks = function (directiveRecords) {
        var res = [];
        var eq = lang_1.IS_DART ? '==' : '===';
        // NOTE(kegluneq): Order is important!
        for (var i = directiveRecords.length - 1; i >= 0; --i) {
            var dir = directiveRecords[i];
            if (dir.callAfterViewInit) {
                res.push("if(" + this._names.getStateName() + " " + eq + " " + this._changeDetectorStateName + ".NeverChecked) " + this._names.getDirectiveName(dir.directiveIndex) + ".ngAfterViewInit();");
            }
            if (dir.callAfterViewChecked) {
                res.push(this._names.getDirectiveName(dir.directiveIndex) + ".ngAfterViewChecked();");
            }
        }
        return res;
    };
    return CodegenLogicUtil;
})();
exports.CodegenLogicUtil = CodegenLogicUtil;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZWdlbl9sb2dpY191dGlsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYW5ndWxhcjIvc3JjL2NvcmUvY2hhbmdlX2RldGVjdGlvbi9jb2RlZ2VuX2xvZ2ljX3V0aWwudHMiXSwibmFtZXMiOlsiQ29kZWdlbkxvZ2ljVXRpbCIsIkNvZGVnZW5Mb2dpY1V0aWwuY29uc3RydWN0b3IiLCJDb2RlZ2VuTG9naWNVdGlsLmdlblByb3BlcnR5QmluZGluZ0V2YWxWYWx1ZSIsIkNvZGVnZW5Mb2dpY1V0aWwuZ2VuRXZlbnRCaW5kaW5nRXZhbFZhbHVlIiwiQ29kZWdlbkxvZ2ljVXRpbC5fZ2VuRXZhbFZhbHVlIiwiQ29kZWdlbkxvZ2ljVXRpbC5fb2JzZXJ2ZSIsIkNvZGVnZW5Mb2dpY1V0aWwuZ2VuUHJvcGVydHlCaW5kaW5nVGFyZ2V0cyIsIkNvZGVnZW5Mb2dpY1V0aWwuZ2VuRGlyZWN0aXZlSW5kaWNlcyIsIkNvZGVnZW5Mb2dpY1V0aWwuX2dlbkludGVycG9sYXRpb24iLCJDb2RlZ2VuTG9naWNVdGlsLmdlbkh5ZHJhdGVEaXJlY3RpdmVzIiwiQ29kZWdlbkxvZ2ljVXRpbC5fZ2VuUmVhZERpcmVjdGl2ZSIsIkNvZGVnZW5Mb2dpY1V0aWwuZ2VuSHlkcmF0ZURldGVjdG9ycyIsIkNvZGVnZW5Mb2dpY1V0aWwuZ2VuQ29udGVudExpZmVjeWNsZUNhbGxiYWNrcyIsIkNvZGVnZW5Mb2dpY1V0aWwuZ2VuVmlld0xpZmVjeWNsZUNhbGxiYWNrcyJdLCJtYXBwaW5ncyI6IkFBQUEscUJBQStELDBCQUEwQixDQUFDLENBQUE7QUFFMUYsK0JBQXlELGtCQUFrQixDQUFDLENBQUE7QUFDNUUsNkJBQXNDLGdCQUFnQixDQUFDLENBQUE7QUFHdkQsMEJBQXNDLGFBQWEsQ0FBQyxDQUFBO0FBQ3BELDJCQUE0QixnQ0FBZ0MsQ0FBQyxDQUFBO0FBRTdEOztHQUVHO0FBQ0g7SUFDRUEsMEJBQW9CQSxNQUF1QkEsRUFBVUEsU0FBaUJBLEVBQ2xEQSx3QkFBZ0NBLEVB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QUFHQSxDQUFDQSxFQUFFQSxDQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxFQUFFQSxDQUFDQSxFQUFFQSxDQUFDQTtZQUN0REEsSUFBSUEsR0FBR0EsR0FBR0EsZ0JBQWdCQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUM5QkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsaUJBQWlCQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDMUJBLEdBQUdBLENBQUNBLElBQUlBLENBQ0pBLFFBQU1BLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFlBQVlBLEVBQUVBLFNBQUlBLEVBQUVBLFNBQUlBLElBQUlBLENBQUNBLHdCQUF3QkEsdUJBQWtCQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxnQkFBZ0JBLENBQUNBLEdBQUdBLENBQUNBLGNBQWNBLENBQUNBLHdCQUFxQkEsQ0FBQ0EsQ0FBQ0E7WUFDdEtBLENBQUNBO1lBRURBLEVBQUVBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLG9CQUFvQkEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7Z0JBQzdCQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFJQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxnQkFBZ0JBLENBQUNBLEdBQUdBLENBQUNBLGNBQWNBLENBQUNBLDJCQUF3QkEsQ0FBQ0EsQ0FBQ0E7WUFDeEZBLENBQUNBO1FBQ0hBLENBQUNBO1FBQ0RBLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBO0lBQ2JBLENBQUNBO0lBQ0hiLHVCQUFDQTtBQUFEQSxDQUFDQSxBQTlNRCxJQThNQztBQTlNWSx3QkFBZ0IsbUJBOE01QixDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtJU19EQVJULCBKc29uLCBTdHJpbmdXcmFwcGVyLCBpc1ByZXNlbnQsIGlzQmxhbmt9IGZyb20gJ2FuZ3VsYXIyL3NyYy9mYWNhZGUvbGFuZyc7XG5pbXBvcnQge0NvZGVnZW5OYW1lVXRpbH0gZnJvbSAnLi9jb2RlZ2VuX25hbWVfdXRpbCc7XG5pbXBvcnQge2NvZGlmeSwgY29tYmluZUdlbmVyYXRlZFN0cmluZ3MsIHJhd1N0cmluZ30gZnJvbSAnLi9jb2RlZ2VuX2ZhY2FkZSc7XG5pbXBvcnQge1Byb3RvUmVjb3JkLCBSZWNvcmRUeXBlfSBmcm9tICcuL3Byb3RvX3JlY29yZCc7XG5pbXBvcnQge0JpbmRpbmdUYXJnZXR9IGZyb20gJy4vYmluZGluZ19yZWNvcmQnO1xuaW1wb3J0IHtEaXJlY3RpdmVSZWNvcmR9IGZyb20gJy4vZGlyZWN0aXZlX3JlY29yZCc7XG5pbXBvcnQge0NoYW5nZURldGVjdGlvblN0cmF0ZWd5fSBmcm9tICcuL2NvbnN0YW50cyc7XG5pbXBvcnQge0Jhc2VFeGNlcHRpb259IGZyb20gJ2FuZ3VsYXIyL3NyYy9mYWNhZGUvZXhjZXB0aW9ucyc7XG5cbi8qKlxuICogQ2xhc3MgcmVzcG9uc2libGUgZm9yIHByb3ZpZGluZyBjaGFuZ2UgZGV0ZWN0aW9uIGxvZ2ljIGZvciBjaGFuZ2UgZGV0ZWN0b3IgY2xhc3Nlcy5cbiAqL1xuZXhwb3J0IGNsYXNzIENvZGVnZW5Mb2dpY1V0aWwge1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIF9uYW1lczogQ29kZWdlbk5hbWVVdGlsLCBwcml2YXRlIF91dGlsTmFtZTogc3RyaW5nLFxuICAgICAgICAgICAgICBwcml2YXRlIF9jaGFuZ2VEZXRlY3RvclN0YXRlTmFtZTogc3RyaW5nLFxuICAgICAgICAgICAgICBwcml2YXRlIF9jaGFuZ2VEZXRlY3Rpb246IENoYW5nZURldGVjdGlvblN0cmF0ZWd5KSB7fVxuXG4gIC8qKlxuICAgKiBHZW5lcmF0ZXMgYSBzdGF0ZW1lbnQgd2hpY2ggdXBkYXRlcyB0aGUgbG9jYWwgdmFyaWFibGUgcmVwcmVzZW50aW5nIGBwcm90b1JlY2Agd2l0aCB0aGUgY3VycmVudFxuICAgKiB2YWx1ZSBvZiB0aGUgcmVjb3JkLiBVc2VkIGJ5IHByb3BlcnR5IGJpbmRpbmdzLlxuICAgKi9cbiAgZ2VuUHJvcGVydHlCaW5kaW5nRXZhbFZhbHVlKHByb3RvUmVjOiBQcm90b1JlY29yZCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX2dlbkV2YWxWYWx1ZShwcm90b1JlYywgaWR4ID0+IHRoaXMuX25hbWVzLmdldExvY2FsTmFtZShpZHgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fbmFtZXMuZ2V0TG9jYWxzQWNjZXNzb3JOYW1lKCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlcyBhIHN0YXRlbWVudCB3aGljaCB1cGRhdGVzIHRoZSBsb2NhbCB2YXJpYWJsZSByZXByZXNlbnRpbmcgYHByb3RvUmVjYCB3aXRoIHRoZSBjdXJyZW50XG4gICAqIHZhbHVlIG9mIHRoZSByZWNvcmQuIFVzZWQgYnkgZXZlbnQgYmluZGluZ3MuXG4gICAqL1xuICBnZW5FdmVudEJpbmRpbmdFdmFsVmFsdWUoZXZlbnRSZWNvcmQ6IGFueSwgcHJvdG9SZWM6IFByb3RvUmVjb3JkKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5fZ2VuRXZhbFZhbHVlKHByb3RvUmVjLCBpZHggPT4gdGhpcy5fbmFtZXMuZ2V0RXZlbnRMb2NhbE5hbWUoZXZlbnRSZWNvcmQsIGlkeCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImxvY2Fsc1wiKTtcbiAgfVxuXG4gIHByaXZhdGUgX2dlbkV2YWxWYWx1ZShwcm90b1JlYzogUHJvdG9SZWNvcmQsIGdldExvY2FsTmFtZTogRnVuY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2NhbHNBY2Nlc3Nvcjogc3RyaW5nKTogc3RyaW5nIHtcbiAgICB2YXIgY29udGV4dCA9IChwcm90b1JlYy5jb250ZXh0SW5kZXggPT0gLTEpID9cbiAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9uYW1lcy5nZXREaXJlY3RpdmVOYW1lKHByb3RvUmVjLmRpcmVjdGl2ZUluZGV4KSA6XG4gICAgICAgICAgICAgICAgICAgICAgZ2V0TG9jYWxOYW1lKHByb3RvUmVjLmNvbnRleHRJbmRleCk7XG4gICAgdmFyIGFyZ1N0cmluZyA9IHByb3RvUmVjLmFyZ3MubWFwKGFyZyA9PiBnZXRMb2NhbE5hbWUoYXJnKSkuam9pbihcIiwgXCIpO1xuXG4gICAgdmFyIHJoczogc3RyaW5nO1xuICAgIHN3aXRjaCAocHJvdG9SZWMubW9kZSkge1xuICAgICAgY2FzZSBSZWNvcmRUeXBlLlNlbGY6XG4gICAgICAgIHJocyA9IGNvbnRleHQ7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIFJlY29yZFR5cGUuQ29uc3Q6XG4gICAgICAgIHJocyA9IGNvZGlmeShwcm90b1JlYy5mdW5jT3JWYWx1ZSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIFJlY29yZFR5cGUuUHJvcGVydHlSZWFkOlxuICAgICAgICByaHMgPSB0aGlzLl9vYnNlcnZlKGAke2NvbnRleHR9LiR7cHJvdG9SZWMubmFtZX1gLCBwcm90b1JlYyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIFJlY29yZFR5cGUuU2FmZVByb3BlcnR5OlxuICAgICAgICB2YXIgcmVhZCA9IHRoaXMuX29ic2VydmUoYCR7Y29udGV4dH0uJHtwcm90b1JlYy5uYW1lfWAsIHByb3RvUmVjKTtcbiAgICAgICAgcmhzID1cbiAgICAgICAgICAgIGAke3RoaXMuX3V0aWxOYW1lfS5pc1ZhbHVlQmxhbmsoJHtjb250ZXh0fSkgPyBudWxsIDogJHt0aGlzLl9vYnNlcnZlKHJlYWQsIHByb3RvUmVjKX1gO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSBSZWNvcmRUeXBlLlByb3BlcnR5V3JpdGU6XG4gICAgICAgIHJocyA9IGAke2NvbnRleHR9LiR7cHJvdG9SZWMubmFtZX0gPSAke2dldExvY2FsTmFtZShwcm90b1JlYy5hcmdzWzBdKX1gO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSBSZWNvcmRUeXBlLkxvY2FsOlxuICAgICAgICByaHMgPSB0aGlzLl9vYnNlcnZlKGAke2xvY2Fsc0FjY2Vzc29yfS5nZXQoJHtyYXdTdHJpbmcocHJvdG9SZWMubmFtZSl9KWAsIHByb3RvUmVjKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgUmVjb3JkVHlwZS5JbnZva2VNZXRob2Q6XG4gICAgICAgIHJocyA9IHRoaXMuX29ic2VydmUoYCR7Y29udGV4dH0uJHtwcm90b1JlYy5uYW1lfSgke2FyZ1N0cmluZ30pYCwgcHJvdG9SZWMpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSBSZWNvcmRUeXBlLlNhZmVNZXRob2RJbnZva2U6XG4gICAgICAgIHZhciBpbnZva2UgPSBgJHtjb250ZXh0fS4ke3Byb3RvUmVjLm5hbWV9KCR7YXJnU3RyaW5nfSlgO1xuICAgICAgICByaHMgPVxuICAgICAgICAgICAgYCR7dGhpcy5fdXRpbE5hbWV9LmlzVmFsdWVCbGFuaygke2NvbnRleHR9KSA/IG51bGwgOiAke3RoaXMuX29ic2VydmUoaW52b2tlLCBwcm90b1JlYyl9YDtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgUmVjb3JkVHlwZS5JbnZva2VDbG9zdXJlOlxuICAgICAgICByaHMgPSBgJHtjb250ZXh0fSgke2FyZ1N0cmluZ30pYDtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgUmVjb3JkVHlwZS5QcmltaXRpdmVPcDpcbiAgICAgICAgcmhzID0gYCR7dGhpcy5fdXRpbE5hbWV9LiR7cHJvdG9SZWMubmFtZX0oJHthcmdTdHJpbmd9KWA7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIFJlY29yZFR5cGUuQ29sbGVjdGlvbkxpdGVyYWw6XG4gICAgICAgIHJocyA9IGAke3RoaXMuX3V0aWxOYW1lfS4ke3Byb3RvUmVjLm5hbWV9KCR7YXJnU3RyaW5nfSlgO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSBSZWNvcmRUeXBlLkludGVycG9sYXRlOlxuICAgICAgICByaHMgPSB0aGlzLl9nZW5JbnRlcnBvbGF0aW9uKHByb3RvUmVjKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgUmVjb3JkVHlwZS5LZXllZFJlYWQ6XG4gICAgICAgIHJocyA9IHRoaXMuX29ic2VydmUoYCR7Y29udGV4dH1bJHtnZXRMb2NhbE5hbWUocHJvdG9SZWMuYXJnc1swXSl9XWAsIHByb3RvUmVjKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgUmVjb3JkVHlwZS5LZXllZFdyaXRlOlxuICAgICAgICByaHMgPSBgJHtjb250ZXh0fVske2dldExvY2FsTmFtZShwcm90b1JlYy5hcmdzWzBdKX1dID0gJHtnZXRMb2NhbE5hbWUocHJvdG9SZWMuYXJnc1sxXSl9YDtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgUmVjb3JkVHlwZS5DaGFpbjpcbiAgICAgICAgcmhzID0gJ251bGwnO1xuICAgICAgICBicmVhaztcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEJhc2VFeGNlcHRpb24oYFVua25vd24gb3BlcmF0aW9uICR7cHJvdG9SZWMubW9kZX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIGAke2dldExvY2FsTmFtZShwcm90b1JlYy5zZWxmSW5kZXgpfSA9ICR7cmhzfTtgO1xuICB9XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBfb2JzZXJ2ZShleHA6IHN0cmluZywgcmVjOiBQcm90b1JlY29yZCk6IHN0cmluZyB7XG4gICAgLy8gVGhpcyBpcyBhbiBleHBlcmltZW50YWwgZmVhdHVyZS4gV29ya3Mgb25seSBpbiBEYXJ0LlxuICAgIGlmICh0aGlzLl9jaGFuZ2VEZXRlY3Rpb24gPT09IENoYW5nZURldGVjdGlvblN0cmF0ZWd5Lk9uUHVzaE9ic2VydmUpIHtcbiAgICAgIHJldHVybiBgdGhpcy5vYnNlcnZlVmFsdWUoJHtleHB9LCAke3JlYy5zZWxmSW5kZXh9KWA7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBleHA7XG4gICAgfVxuICB9XG5cbiAgZ2VuUHJvcGVydHlCaW5kaW5nVGFyZ2V0cyhwcm9wZXJ0eUJpbmRpbmdUYXJnZXRzOiBCaW5kaW5nVGFyZ2V0W10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2VuRGVidWdJbmZvOiBib29sZWFuKTogc3RyaW5nIHtcbiAgICB2YXIgYnMgPSBwcm9wZXJ0eUJpbmRpbmdUYXJnZXRzLm1hcChiID0+IHtcbiAgICAgIGlmIChpc0JsYW5rKGIpKSByZXR1cm4gXCJudWxsXCI7XG5cbiAgICAgIHZhciBkZWJ1ZyA9IGdlbkRlYnVnSW5mbyA/IGNvZGlmeShiLmRlYnVnKSA6IFwibnVsbFwiO1xuICAgICAgcmV0dXJuIGAke3RoaXMuX3V0aWxOYW1lfS5iaW5kaW5nVGFyZ2V0KCR7Y29kaWZ5KGIubW9kZSl9LCAke2IuZWxlbWVudEluZGV4fSwgJHtjb2RpZnkoYi5uYW1lKX0sICR7Y29kaWZ5KGIudW5pdCl9LCAke2RlYnVnfSlgO1xuICAgIH0pO1xuICAgIHJldHVybiBgWyR7YnMuam9pbihcIiwgXCIpfV1gO1xuICB9XG5cbiAgZ2VuRGlyZWN0aXZlSW5kaWNlcyhkaXJlY3RpdmVSZWNvcmRzOiBEaXJlY3RpdmVSZWNvcmRbXSk6IHN0cmluZyB7XG4gICAgdmFyIGJzID0gZGlyZWN0aXZlUmVjb3Jkcy5tYXAoXG4gICAgICAgIGIgPT5cbiAgICAgICAgICAgIGAke3RoaXMuX3V0aWxOYW1lfS5kaXJlY3RpdmVJbmRleCgke2IuZGlyZWN0aXZlSW5kZXguZWxlbWVudEluZGV4fSwgJHtiLmRpcmVjdGl2ZUluZGV4LmRpcmVjdGl2ZUluZGV4fSlgKTtcbiAgICByZXR1cm4gYFske2JzLmpvaW4oXCIsIFwiKX1dYDtcbiAgfVxuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgX2dlbkludGVycG9sYXRpb24ocHJvdG9SZWM6IFByb3RvUmVjb3JkKTogc3RyaW5nIHtcbiAgICB2YXIgaVZhbHMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHByb3RvUmVjLmFyZ3MubGVuZ3RoOyArK2kpIHtcbiAgICAgIGlWYWxzLnB1c2goY29kaWZ5KHByb3RvUmVjLmZpeGVkQXJnc1tpXSkpO1xuICAgICAgaVZhbHMucHVzaChgJHt0aGlzLl91dGlsTmFtZX0ucygke3RoaXMuX25hbWVzLmdldExvY2FsTmFtZShwcm90b1JlYy5hcmdzW2ldKX0pYCk7XG4gICAgfVxuICAgIGlWYWxzLnB1c2goY29kaWZ5KHByb3RvUmVjLmZpeGVkQXJnc1twcm90b1JlYy5hcmdzLmxlbmd0aF0pKTtcbiAgICByZXR1cm4gY29tYmluZUdlbmVyYXRlZFN0cmluZ3MoaVZhbHMpO1xuICB9XG5cbiAgZ2VuSHlkcmF0ZURpcmVjdGl2ZXMoZGlyZWN0aXZlUmVjb3JkczogRGlyZWN0aXZlUmVjb3JkW10pOiBzdHJpbmcge1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRpcmVjdGl2ZVJlY29yZHMubGVuZ3RoOyArK2kpIHtcbiAgICAgIHZhciByID0gZGlyZWN0aXZlUmVjb3Jkc1tpXTtcbiAgICAgIHJlcy5wdXNoKGAke3RoaXMuX25hbWVzLmdldERpcmVjdGl2ZU5hbWUoci5kaXJlY3RpdmVJbmRleCl9ID0gJHt0aGlzLl9nZW5SZWFkRGlyZWN0aXZlKGkpfTtgKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcy5qb2luKFwiXFxuXCIpO1xuICB9XG5cbiAgcHJpdmF0ZSBfZ2VuUmVhZERpcmVjdGl2ZShpbmRleDogbnVtYmVyKSB7XG4gICAgLy8gVGhpcyBpcyBhbiBleHBlcmltZW50YWwgZmVhdHVyZS4gV29ya3Mgb25seSBpbiBEYXJ0LlxuICAgIGlmICh0aGlzLl9jaGFuZ2VEZXRlY3Rpb24gPT09IENoYW5nZURldGVjdGlvblN0cmF0ZWd5Lk9uUHVzaE9ic2VydmUpIHtcbiAgICAgIHJldHVybiBgdGhpcy5vYnNlcnZlRGlyZWN0aXZlKHRoaXMuZ2V0RGlyZWN0aXZlRm9yKGRpcmVjdGl2ZXMsICR7aW5kZXh9KSwgJHtpbmRleH0pYDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGB0aGlzLmdldERpcmVjdGl2ZUZvcihkaXJlY3RpdmVzLCAke2luZGV4fSlgO1xuICAgIH1cbiAgfVxuXG4gIGdlbkh5ZHJhdGVEZXRlY3RvcnMoZGlyZWN0aXZlUmVjb3JkczogRGlyZWN0aXZlUmVjb3JkW10pOiBzdHJpbmcge1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRpcmVjdGl2ZVJlY29yZHMubGVuZ3RoOyArK2kpIHtcbiAgICAgIHZhciByID0gZGlyZWN0aXZlUmVjb3Jkc1tpXTtcbiAgICAgIGlmICghci5pc0RlZmF1bHRDaGFuZ2VEZXRlY3Rpb24oKSkge1xuICAgICAgICByZXMucHVzaChcbiAgICAgICAgICAgIGAke3RoaXMuX25hbWVzLmdldERldGVjdG9yTmFtZShyLmRpcmVjdGl2ZUluZGV4KX0gPSB0aGlzLmdldERldGVjdG9yRm9yKGRpcmVjdGl2ZXMsICR7aX0pO2ApO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzLmpvaW4oXCJcXG5cIik7XG4gIH1cblxuICBnZW5Db250ZW50TGlmZWN5Y2xlQ2FsbGJhY2tzKGRpcmVjdGl2ZVJlY29yZHM6IERpcmVjdGl2ZVJlY29yZFtdKTogc3RyaW5nW10ge1xuICAgIHZhciByZXMgPSBbXTtcbiAgICB2YXIgZXEgPSBJU19EQVJUID8gJz09JyA6ICc9PT0nO1xuICAgIC8vIE5PVEUoa2VnbHVuZXEpOiBPcmRlciBpcyBpbXBvcnRhbnQhXG4gICAgZm9yICh2YXIgaSA9IGRpcmVjdGl2ZVJlY29yZHMubGVuZ3RoIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICAgIHZhciBkaXIgPSBkaXJlY3RpdmVSZWNvcmRzW2ldO1xuICAgICAgaWYgKGRpci5jYWxsQWZ0ZXJDb250ZW50SW5pdCkge1xuICAgICAgICByZXMucHVzaChcbiAgICAgICAgICAgIGBpZigke3RoaXMuX25hbWVzLmdldFN0YXRlTmFtZSgpfSAke2VxfSAke3RoaXMuX2NoYW5nZURldGVjdG9yU3RhdGVOYW1lfS5OZXZlckNoZWNrZWQpICR7dGhpcy5fbmFtZXMuZ2V0RGlyZWN0aXZlTmFtZShkaXIuZGlyZWN0aXZlSW5kZXgpfS5uZ0FmdGVyQ29udGVudEluaXQoKTtgKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGRpci5jYWxsQWZ0ZXJDb250ZW50Q2hlY2tlZCkge1xuICAgICAgICByZXMucHVzaChgJHt0aGlzLl9uYW1lcy5nZXREaXJlY3RpdmVOYW1lKGRpci5kaXJlY3RpdmVJbmRleCl9Lm5nQWZ0ZXJDb250ZW50Q2hlY2tlZCgpO2ApO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgZ2VuVmlld0xpZmVjeWNsZUNhbGxiYWNrcyhkaXJlY3RpdmVSZWNvcmRzOiBEaXJlY3RpdmVSZWNvcmRbXSk6IHN0cmluZ1tdIHtcbiAgICB2YXIgcmVzID0gW107XG4gICAgdmFyIGVxID0gSVNfREFSVCA/ICc9PScgOiAnPT09JztcbiAgICAvLyBOT1RFKGtlZ2x1bmVxKTogT3JkZXIgaXMgaW1wb3J0YW50IVxuICAgIGZvciAodmFyIGkgPSBkaXJlY3RpdmVSZWNvcmRzLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICB2YXIgZGlyID0gZGlyZWN0aXZlUmVjb3Jkc1tpXTtcbiAgICAgIGlmIChkaXIuY2FsbEFmdGVyVmlld0luaXQpIHtcbiAgICAgICAgcmVzLnB1c2goXG4gICAgICAgICAgICBgaWYoJHt0aGlzLl9uYW1lcy5nZXRTdGF0ZU5hbWUoKX0gJHtlcX0gJHt0aGlzLl9jaGFuZ2VEZXRlY3RvclN0YXRlTmFtZX0uTmV2ZXJDaGVja2VkKSAke3RoaXMuX25hbWVzLmdldERpcmVjdGl2ZU5hbWUoZGlyLmRpcmVjdGl2ZUluZGV4KX0ubmdBZnRlclZpZXdJbml0KCk7YCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChkaXIuY2FsbEFmdGVyVmlld0NoZWNrZWQpIHtcbiAgICAgICAgcmVzLnB1c2goYCR7dGhpcy5fbmFtZXMuZ2V0RGlyZWN0aXZlTmFtZShkaXIuZGlyZWN0aXZlSW5kZXgpfS5uZ0FmdGVyVmlld0NoZWNrZWQoKTtgKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbiAgfVxufVxuIl19